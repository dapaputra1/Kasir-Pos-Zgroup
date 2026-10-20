import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { ApiError } from '../middlewares/errorHandler';

export class ShiftService {
  /**
   * Buka shift kasir baru
   */
  static async startShift(userId: number, startingCash: number, notes?: string) {
    // Pastikan kasir tidak memiliki shift yang sedang aktif
    const activeShift = await prisma.cashShift.findFirst({
      where: {
        userId,
        status: 'OPEN',
      },
    });

    if (activeShift) {
      throw new ApiError(
        400,
        'Anda masih memiliki sesi shift kasir yang aktif. Harap tutup shift tersebut terlebih dahulu.',
        'ACTIVE_SHIFT_EXISTS'
      );
    }

    const shift = await prisma.cashShift.create({
      data: {
        userId,
        startingCash: new Prisma.Decimal(startingCash),
        status: 'OPEN',
        notes: notes || null,
      },
      include: {
        user: {
          select: { id: true, name: true, role: true },
        },
      },
    });

    return shift;
  }

  /**
   * Ambil shift aktif kasir saat ini beserta akumulasi transaksi berjalan
   */
  static async getCurrentShift(userId: number) {
    const shift = await prisma.cashShift.findFirst({
      where: {
        userId,
        status: 'OPEN',
      },
      include: {
        user: {
          select: { id: true, name: true, role: true },
        },
      },
    });

    if (!shift) {
      return null;
    }

    // Ambil order penjualan selama shift ini berjalan
    const orders = await prisma.order.findMany({
      where: {
        OR: [
          { cashShiftId: shift.id },
          { userId, createdAt: { gte: shift.startTime } },
        ],
        status: 'COMPLETED',
      },
      select: {
        id: true,
        totalAmount: true,
        paymentMethod: true,
        amountPaid: true,
        changeAmount: true,
      },
    });

    let totalCashSales = new Prisma.Decimal(0);
    let totalNonCashSales = new Prisma.Decimal(0);

    for (const ord of orders) {
      if (ord.paymentMethod === 'CASH') {
        // Uang tunai riil yang masuk = total tagihan
        totalCashSales = totalCashSales.plus(ord.totalAmount);
      } else {
        totalNonCashSales = totalNonCashSales.plus(ord.totalAmount);
      }
    }

    // Ambil pembayaran pelunasan piutang bon tunai selama shift
    const debtPayments = await prisma.orderPayment.findMany({
      where: {
        userId,
        paymentDate: { gte: shift.startTime },
        paymentMethod: 'CASH',
      },
      select: { amount: true },
    });

    let totalCashDebtPaid = new Prisma.Decimal(0);
    for (const dp of debtPayments) {
      totalCashDebtPaid = totalCashDebtPaid.plus(dp.amount);
    }

    // Ambil pengembalian dana retur penjualan tunai selama shift
    const cashRefunds = await prisma.saleReturn.findMany({
      where: {
        userId,
        createdAt: { gte: shift.startTime },
        refundMethod: 'CASH',
      },
      select: { totalAmount: true },
    });

    let totalCashRefunds = new Prisma.Decimal(0);
    for (const rf of cashRefunds) {
      totalCashRefunds = totalCashRefunds.plus(rf.totalAmount);
    }

    // Hitung ekspektasi uang kas di laci kasir
    const expectedCash = shift.startingCash
      .plus(totalCashSales)
      .plus(totalCashDebtPaid)
      .minus(totalCashRefunds);

    return {
      ...shift,
      startingCash: Number(shift.startingCash),
      metrics: {
        totalOrdersCount: orders.length,
        totalCashSales: Number(totalCashSales),
        totalNonCashSales: Number(totalNonCashSales),
        totalCashDebtPaid: Number(totalCashDebtPaid),
        totalCashRefunds: Number(totalCashRefunds),
        expectedCash: Number(expectedCash),
      },
    };
  }

  /**
   * Tutup shift kasir & rekonsiliasi kas laci
   */
  static async closeShift(userId: number, closingCash: number, notes?: string) {
    const shiftWithStats = await this.getCurrentShift(userId);

    if (!shiftWithStats) {
      throw new ApiError(404, 'Tidak ditemukan shift kasir aktif untuk pengguna ini.', 'NO_ACTIVE_SHIFT');
    }

    const expectedCash = new Prisma.Decimal(shiftWithStats.metrics.expectedCash);
    const actualClosingCash = new Prisma.Decimal(closingCash);
    const difference = actualClosingCash.minus(expectedCash);

    const closedShift = await prisma.cashShift.update({
      where: { id: shiftWithStats.id },
      data: {
        endTime: new Date(),
        closingCash: actualClosingCash,
        expectedCash,
        difference,
        status: 'CLOSED',
        notes: notes ? (shiftWithStats.notes ? `${shiftWithStats.notes}\n${notes}` : notes) : shiftWithStats.notes,
      },
      include: {
        user: {
          select: { id: true, name: true, role: true },
        },
      },
    });

    return {
      ...closedShift,
      startingCash: Number(closedShift.startingCash),
      closingCash: Number(closedShift.closingCash),
      expectedCash: Number(closedShift.expectedCash),
      difference: Number(closedShift.difference),
      summary: shiftWithStats.metrics,
    };
  }

  /**
   * Riwayat seluruh shift kasir (Owner / Admin)
   */
  static async getAllShifts(params: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
    userId?: number;
  }) {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 20;
    const { startDate, endDate, userId } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.CashShiftWhereInput = {};

    if (userId) {
      where.userId = userId;
    }

    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) {
        where.startTime.gte = new Date(`${startDate}T00:00:00.000Z`);
      }
      if (endDate) {
        where.startTime.lte = new Date(`${endDate}T23:59:59.999Z`);
      }
    }

    const [shifts, total] = await Promise.all([
      prisma.cashShift.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startTime: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, role: true },
          },
        },
      }),
      prisma.cashShift.count({ where }),
    ]);

    return {
      shifts: shifts.map((s) => ({
        ...s,
        startingCash: Number(s.startingCash),
        expectedCash: s.expectedCash ? Number(s.expectedCash) : null,
        closingCash: s.closingCash ? Number(s.closingCash) : null,
        difference: s.difference ? Number(s.difference) : null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
