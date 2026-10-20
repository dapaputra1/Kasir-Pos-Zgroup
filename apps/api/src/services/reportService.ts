import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';

export class ReportService {
  /**
   * Profit & Loss (Laba Rugi) calculation
   */
  static async getProfitAndLoss(startDate?: string, endDate?: string) {
    const hasDate = Boolean(startDate || endDate);
    const dateFilter: Prisma.DateTimeFilter = {};
    if (startDate) dateFilter.gte = new Date(`${startDate}T00:00:00.000Z`);
    if (endDate) dateFilter.lte = new Date(`${endDate}T23:59:59.999Z`);

    const orderWhere: Prisma.OrderWhereInput = {
      status: 'COMPLETED',
      ...(hasDate ? { createdAt: dateFilter } : {}),
    };

    const purchaseWhere: Prisma.PurchaseWhereInput = {
      status: 'RECEIVED',
      ...(hasDate ? { purchaseDate: dateFilter } : {}),
    };

    const [orders, purchases, items, saleReturns] = await Promise.all([
      prisma.order.findMany({
        where: orderWhere,
        select: {
          subtotal: true,
          discountAmount: true,
          taxAmount: true,
          totalAmount: true,
          amountPaid: true,
        },
      }),
      prisma.purchase.findMany({
        where: purchaseWhere,
        select: {
          totalAmount: true,
          amountPaid: true,
        },
      }),
      prisma.orderItem.findMany({
        where: {
          order: orderWhere,
        },
        select: {
          costPrice: true,
          quantity: true,
          totalAmount: true,
        },
      }),
      prisma.saleReturn.findMany({
        where: hasDate ? { createdAt: dateFilter } : {},
        select: { totalAmount: true },
      }),
    ]);

    const totalGrossRevenue = orders.reduce((acc, curr) => acc + Number(curr.totalAmount), 0);
    const totalDiscount = orders.reduce((acc, curr) => acc + Number(curr.discountAmount), 0);
    const totalTax = orders.reduce((acc, curr) => acc + Number(curr.taxAmount), 0);
    const totalReturns = saleReturns.reduce((acc, curr) => acc + Number(curr.totalAmount), 0);

    // Net Revenue = Gross Revenue - Total Returns
    const totalRevenue = Math.max(0, totalGrossRevenue - totalReturns);

    // Total HPP (Cost of Goods Sold)
    const totalCogs = items.reduce((acc, curr) => {
      const itemCost = Number(curr.costPrice) * Number(curr.quantity);
      return acc + itemCost;
    }, 0);

    const grossProfit = totalRevenue - totalCogs;
    const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    const totalPurchases = purchases.reduce((acc, curr) => acc + Number(curr.totalAmount), 0);

    return {
      totalOrders: orders.length,
      totalGrossRevenue,
      totalReturns,
      totalRevenue,
      totalDiscount,
      totalTax,
      totalCogs,
      grossProfit,
      grossMargin: Math.round(grossMargin * 10) / 10,
      totalPurchases,
      totalPurchaseCount: purchases.length,
    };
  }

  /**
   * Top selling products with sales volume and revenue
   */
  static async getTopSellingProducts(limit = 10, startDate?: string, endDate?: string) {
    const orderWhere: Prisma.OrderWhereInput = {
      status: 'COMPLETED',
    };

    if (startDate || endDate) {
      orderWhere.createdAt = {};
      if (startDate) orderWhere.createdAt.gte = new Date(`${startDate}T00:00:00.000Z`);
      if (endDate) orderWhere.createdAt.lte = new Date(`${endDate}T23:59:59.999Z`);
    }

    const orderItems = await prisma.orderItem.findMany({
      where: { order: orderWhere },
      select: {
        productId: true,
        productName: true,
        sku: true,
        baseQuantity: true,
        totalAmount: true,
        costPrice: true,
        quantity: true,
      },
    });

    const productMap = new Map<
      number,
      {
        productId: number;
        productName: string;
        sku: string;
        totalQty: number;
        totalRevenue: number;
        totalCogs: number;
      }
    >();

    for (const item of orderItems) {
      const existing = productMap.get(item.productId) || {
        productId: item.productId,
        productName: item.productName,
        sku: item.sku,
        totalQty: 0,
        totalRevenue: 0,
        totalCogs: 0,
      };

      existing.totalQty += Number(item.baseQuantity);
      existing.totalRevenue += Number(item.totalAmount);
      existing.totalCogs += Number(item.costPrice) * Number(item.quantity);
      productMap.set(item.productId, existing);
    }

    const sorted = Array.from(productMap.values())
      .map((p) => {
        const profit = p.totalRevenue - p.totalCogs;
        const margin = p.totalRevenue > 0 ? (profit / p.totalRevenue) * 100 : 0;
        return {
          ...p,
          profit,
          margin: Math.round(margin * 10) / 10,
        };
      })
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, limit);

    return sorted;
  }

  /**
   * Cash Flow (Arus Kas Masuk vs Keluar) - Airtight double-counting prevention
   */
  static async getCashflow(startDate?: string, endDate?: string) {
    const dateFilter: Prisma.DateTimeFilter = {};
    if (startDate) dateFilter.gte = new Date(`${startDate}T00:00:00.000Z`);
    if (endDate) dateFilter.lte = new Date(`${endDate}T23:59:59.999Z`);

    const hasDate = Boolean(startDate || endDate);

    const [salesPaid, customerDebtPaid, purchasesPaid, supplierDebtPaid, cashRefunds] = await Promise.all([
      // Sales cash received directly (excl TEMPO to avoid double-counting installments)
      prisma.order.aggregate({
        where: {
          status: 'COMPLETED',
          paymentMethod: { not: 'TEMPO' },
          ...(hasDate ? { createdAt: dateFilter } : {}),
        },
        _sum: { amountPaid: true },
      }),
      // Customer tempo debt payments
      prisma.orderPayment.aggregate({
        where: hasDate ? { paymentDate: dateFilter } : {},
        _sum: { amount: true },
      }),
      // Direct purchase cash paid
      prisma.purchase.aggregate({
        where: {
          status: 'RECEIVED',
          paymentType: 'CASH',
          ...(hasDate ? { purchaseDate: dateFilter } : {}),
        },
        _sum: { amountPaid: true },
      }),
      // Supplier debt repayments
      prisma.purchasePayment.aggregate({
        where: hasDate ? { paymentDate: dateFilter } : {},
        _sum: { amount: true },
      }),
      // Cash refunds paid out to customers from returns
      prisma.saleReturn.aggregate({
        where: {
          refundMethod: 'CASH',
          ...(hasDate ? { createdAt: dateFilter } : {}),
        },
        _sum: { totalAmount: true },
      }),
    ]);

    const cashInSales = Number(salesPaid._sum.amountPaid || 0);
    const cashInReceivables = Number(customerDebtPaid._sum.amount || 0);
    const totalCashIn = cashInSales + cashInReceivables;

    const cashOutPurchases = Number(purchasesPaid._sum.amountPaid || 0);
    const cashOutPayables = Number(supplierDebtPaid._sum.amount || 0);
    const cashOutRefunds = Number(cashRefunds._sum.totalAmount || 0);
    const totalCashOut = cashOutPurchases + cashOutPayables + cashOutRefunds;

    const netCashflow = totalCashIn - totalCashOut;

    return {
      cashIn: {
        salesPaid: cashInSales,
        receivablesPaid: cashInReceivables,
        total: totalCashIn,
      },
      cashOut: {
        purchasesPaid: cashOutPurchases,
        payablesPaid: cashOutPayables,
        refundsPaid: cashOutRefunds,
        total: totalCashOut,
      },
      netCashflow,
    };
  }

  /**
   * Export CSV data generator
   */
  static async generateCsvExport(type: 'sales' | 'purchases' | 'inventory', startDate?: string, endDate?: string) {
    const hasDate = startDate || endDate;
    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(`${startDate}T00:00:00.000Z`);
    if (endDate) dateFilter.lte = new Date(`${endDate}T23:59:59.999Z`);

    if (type === 'sales') {
      const orders = await prisma.order.findMany({
        where: {
          status: 'COMPLETED',
          ...(hasDate ? { createdAt: dateFilter } : {}),
        },
        include: {
          customer: true,
          user: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      const rows = [
        ['No. Faktur', 'Tanggal', 'Kasir', 'Pelanggan', 'Metode Bayar', 'Status Bayar', 'Total Nilai (Rp)', 'Uang Diterima (Rp)'],
        ...orders.map((o) => [
          o.invoiceNumber,
          o.createdAt.toISOString().slice(0, 10),
          o.user.name,
          o.customer?.name || 'Pelanggan Umum',
          o.paymentMethod,
          o.paymentStatus,
          Number(o.totalAmount).toString(),
          Number(o.amountPaid).toString(),
        ]),
      ];

      return rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    }

    if (type === 'purchases') {
      const purchases = await prisma.purchase.findMany({
        where: {
          status: 'RECEIVED',
          ...(hasDate ? { purchaseDate: dateFilter } : {}),
        },
        include: {
          supplier: true,
          user: true,
        },
        orderBy: { purchaseDate: 'desc' },
      });

      const rows = [
        ['No. Faktur Kulakan', 'Tanggal Masuk', 'Petugas', 'Supplier', 'No. SJ Supplier', 'Sistem Bayar', 'Status Pelunasan', 'Total (Rp)', 'Terbayar (Rp)'],
        ...purchases.map((p) => [
          p.purchaseNumber,
          p.purchaseDate.toISOString().slice(0, 10),
          p.user.name,
          p.supplier.name,
          p.supplierInvoiceNo || '-',
          p.paymentType,
          p.paymentStatus,
          Number(p.totalAmount).toString(),
          Number(p.amountPaid).toString(),
        ]),
      ];

      return rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    }

    // Inventory movements
    const movements = await prisma.stockMovement.findMany({
      where: hasDate ? { createdAt: dateFilter } : {},
      include: {
        product: true,
        user: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const rows = [
      ['Waktu', 'SKU', 'Nama Produk', 'Tipe Mutasi', 'Jumlah', 'Satuan', 'Stok Sebelum', 'Stok Sesudah', 'Ref', 'Keterangan', 'Petugas'],
      ...movements.map((m) => [
        m.createdAt.toISOString().slice(0, 19).replace('T', ' '),
        m.product.sku,
        m.product.name,
        m.type,
        Number(m.quantity).toString(),
        m.product.baseUnit,
        Number(m.previousStock).toString(),
        Number(m.currentStock).toString(),
        m.referenceId || '-',
        m.note || '-',
        m.user?.name || 'Sistem',
      ]),
    ];

    return rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
  }
}
