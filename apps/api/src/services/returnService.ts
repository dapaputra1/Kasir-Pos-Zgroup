import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { ApiError } from '../middlewares/errorHandler';

export class ReturnService {
  /**
   * Helper generator nomor retur unik: RET-J-YYYYMMDD-XXXX atau RET-B-YYYYMMDD-XXXX
   */
  private static async generateReturnNumber(prefix: 'RET-J' | 'RET-B'): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const searchPrefix = `${prefix}-${dateStr}-`;

    let count = 0;
    if (prefix === 'RET-J') {
      count = await prisma.saleReturn.count({
        where: { returnNumber: { startsWith: searchPrefix } },
      });
    } else {
      count = await prisma.purchaseReturn.count({
        where: { returnNumber: { startsWith: searchPrefix } },
      });
    }

    const sequence = String(count + 1).padStart(4, '0');
    return `${searchPrefix}${sequence}`;
  }

  /**
   * Proses Retur Penjualan Pelanggan (Sales Return)
   */
  static async createSaleReturn(
    userId: number,
    data: {
      orderId: number;
      reason: string;
      refundMethod: 'CASH' | 'CREDIT_OFFSET' | 'NO_REFUND';
      items: Array<{
        productId: number;
        unitName: string;
        quantity: number;
        returnToStock: boolean;
      }>;
    }
  ) {
    const order = await prisma.order.findUnique({
      where: { id: data.orderId },
      include: {
        items: true,
        customer: true,
        saleReturns: {
          include: { items: true },
        },
      },
    });

    if (!order) {
      throw new ApiError(404, 'Faktur penjualan tidak ditemukan.', 'ORDER_NOT_FOUND');
    }

    if (order.status !== 'COMPLETED') {
      throw new ApiError(400, 'Hanya faktur dengan status selesai yang dapat diretur.', 'INVALID_ORDER_STATUS');
    }

    // Hitung riwayat retur sebelumnya untuk setiap item pada order ini
    const previouslyReturnedMap = new Map<string, number>();
    for (const prevRet of order.saleReturns) {
      for (const item of prevRet.items) {
        const key = `${item.productId}-${item.unitName}`;
        const current = previouslyReturnedMap.get(key) || 0;
        previouslyReturnedMap.set(key, current + Number(item.quantity));
      }
    }

    let calculatedTotalAmount = new Prisma.Decimal(0);
    const returnItemsPayload: Array<{
      productId: number;
      unitName: string;
      conversionFactor: Prisma.Decimal;
      quantity: Prisma.Decimal;
      baseQuantity: Prisma.Decimal;
      price: Prisma.Decimal;
      subtotal: Prisma.Decimal;
      returnToStock: boolean;
    }> = [];

    for (const reqItem of data.items) {
      const orderItem = order.items.find(
        (oi) => oi.productId === reqItem.productId && oi.unitName === reqItem.unitName
      );

      if (!orderItem) {
        throw new ApiError(
          400,
          `Produk ID ${reqItem.productId} dengan satuan ${reqItem.unitName} tidak terdapat dalam faktur penjualan ini.`,
          'ITEM_NOT_IN_ORDER'
        );
      }

      const key = `${reqItem.productId}-${reqItem.unitName}`;
      const alreadyReturned = previouslyReturnedMap.get(key) || 0;
      const availableToReturn = Number(orderItem.quantity) - alreadyReturned;

      if (reqItem.quantity > availableToReturn) {
        throw new ApiError(
          400,
          `Jumlah retur untuk ${orderItem.productName} (${reqItem.quantity} ${reqItem.unitName}) melebihi sisa pembelian yang dapat diretur (${availableToReturn} ${reqItem.unitName}).`,
          'RETURN_QTY_EXCEEDED'
        );
      }

      const qtyDec = new Prisma.Decimal(reqItem.quantity);
      const convDec = orderItem.conversionFactor;
      const baseQtyDec = qtyDec.mul(convDec);
      const subtotalDec = qtyDec.mul(orderItem.unitPrice);

      calculatedTotalAmount = calculatedTotalAmount.plus(subtotalDec);

      returnItemsPayload.push({
        productId: reqItem.productId,
        unitName: reqItem.unitName,
        conversionFactor: convDec,
        quantity: qtyDec,
        baseQuantity: baseQtyDec,
        price: orderItem.unitPrice,
        subtotal: subtotalDec,
        returnToStock: reqItem.returnToStock,
      });
    }

    const returnNumber = await this.generateReturnNumber('RET-J');

    // Transaksi ACID
    const result = await prisma.$transaction(async (tx) => {
      // 1. Buat record SaleReturn
      const saleReturn = await tx.saleReturn.create({
        data: {
          returnNumber,
          orderId: order.id,
          userId,
          reason: data.reason,
          refundMethod: data.refundMethod,
          totalAmount: calculatedTotalAmount,
          items: {
            create: returnItemsPayload,
          },
        },
        include: {
          items: {
            include: {
              product: { select: { id: true, name: true, sku: true } },
            },
          },
          order: {
            select: { id: true, invoiceNumber: true },
          },
          user: {
            select: { id: true, name: true },
          },
        },
      });

      // 2. Jika barang layak jual (returnToStock = true), kembalikan ke stok fisik
      for (const item of returnItemsPayload) {
        if (item.returnToStock) {
          const product = await tx.product.findUniqueOrThrow({
            where: { id: item.productId },
          });

          const currentStock = product.currentStock;
          const newStock = currentStock.plus(item.baseQuantity);

          await tx.product.update({
            where: { id: item.productId },
            data: { currentStock: newStock },
          });

          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              type: 'RETURN',
              quantity: item.baseQuantity,
              previousStock: currentStock,
              currentStock: newStock,
              referenceType: 'SALE_RETURN',
              referenceId: returnNumber,
              note: `Retur Penjualan ${returnNumber} (${item.quantity} ${item.unitName})`,
              userId,
            },
          });
        }
      }

      // 3. Jika refundMethod CREDIT_OFFSET dan faktur tempo masih memiliki sisa piutang
      if (data.refundMethod === 'CREDIT_OFFSET' && order.paymentMethod === 'TEMPO') {
        const remainingDebt = Number(order.totalAmount) - Number(order.amountPaid);
        if (remainingDebt > 0) {
          const deduction = Math.min(remainingDebt, Number(calculatedTotalAmount));
          const newAmountPaid = Number(order.amountPaid) + deduction;
          const newStatus = newAmountPaid >= Number(order.totalAmount) ? 'PAID' : 'PARTIAL';

          await tx.order.update({
            where: { id: order.id },
            data: {
              amountPaid: new Prisma.Decimal(newAmountPaid),
              paymentStatus: newStatus,
            },
          });

          await tx.orderPayment.create({
            data: {
              orderId: order.id,
              userId,
              amount: new Prisma.Decimal(deduction),
              paymentMethod: 'CASH',
              note: `Kompensasi Retur Penjualan No. ${returnNumber}`,
            },
          });
        }
      }

      return saleReturn;
    });

    return {
      ...result,
      totalAmount: Number(result.totalAmount),
      items: result.items.map((i) => ({
        ...i,
        quantity: Number(i.quantity),
        baseQuantity: Number(i.baseQuantity),
        conversionFactor: Number(i.conversionFactor),
        price: Number(i.price),
        subtotal: Number(i.subtotal),
      })),
    };
  }

  /**
   * Proses Retur Pembelian ke Distributor / Supplier (Purchase Return)
   */
  static async createPurchaseReturn(
    userId: number,
    data: {
      purchaseId: number;
      reason: string;
      refundMethod: 'CASH' | 'DEBT_OFFSET';
      items: Array<{
        productId: number;
        unitName: string;
        quantity: number;
      }>;
    }
  ) {
    const purchase = await prisma.purchase.findUnique({
      where: { id: data.purchaseId },
      include: {
        items: true,
        supplier: true,
        purchaseReturns: {
          include: { items: true },
        },
      },
    });

    if (!purchase) {
      throw new ApiError(404, 'Faktur pembelian tidak ditemukan.', 'PURCHASE_NOT_FOUND');
    }

    if (purchase.status !== 'RECEIVED') {
      throw new ApiError(400, 'Hanya faktur pembelian yang telah diterima yang dapat diretur.', 'INVALID_PURCHASE_STATUS');
    }

    // Riwayat retur sebelumnya
    const previouslyReturnedMap = new Map<string, number>();
    for (const prevRet of purchase.purchaseReturns) {
      for (const item of prevRet.items) {
        const key = `${item.productId}-${item.unitName}`;
        const current = previouslyReturnedMap.get(key) || 0;
        previouslyReturnedMap.set(key, current + Number(item.quantity));
      }
    }

    let calculatedTotalAmount = new Prisma.Decimal(0);
    const returnItemsPayload: Array<{
      productId: number;
      unitName: string;
      conversionFactor: Prisma.Decimal;
      quantity: Prisma.Decimal;
      baseQuantity: Prisma.Decimal;
      cost: Prisma.Decimal;
      subtotal: Prisma.Decimal;
    }> = [];

    for (const reqItem of data.items) {
      const pItem = purchase.items.find(
        (pi) => pi.productId === reqItem.productId && pi.unitName === reqItem.unitName
      );

      if (!pItem) {
        throw new ApiError(
          400,
          `Produk ID ${reqItem.productId} dengan satuan ${reqItem.unitName} tidak terdapat dalam faktur pembelian ini.`,
          'ITEM_NOT_IN_PURCHASE'
        );
      }

      const key = `${reqItem.productId}-${reqItem.unitName}`;
      const alreadyReturned = previouslyReturnedMap.get(key) || 0;
      const availableToReturn = Number(pItem.quantity) - alreadyReturned;

      if (reqItem.quantity > availableToReturn) {
        throw new ApiError(
          400,
          `Jumlah retur untuk ${pItem.productName} (${reqItem.quantity} ${reqItem.unitName}) melebihi kuantitas yang dapat diretur (${availableToReturn} ${reqItem.unitName}).`,
          'RETURN_QTY_EXCEEDED'
        );
      }

      const qtyDec = new Prisma.Decimal(reqItem.quantity);
      const convDec = pItem.conversionFactor;
      const baseQtyDec = qtyDec.mul(convDec);
      const subtotalDec = qtyDec.mul(pItem.unitCost);

      calculatedTotalAmount = calculatedTotalAmount.plus(subtotalDec);

      returnItemsPayload.push({
        productId: reqItem.productId,
        unitName: reqItem.unitName,
        conversionFactor: convDec,
        quantity: qtyDec,
        baseQuantity: baseQtyDec,
        cost: pItem.unitCost,
        subtotal: subtotalDec,
      });
    }

    const returnNumber = await this.generateReturnNumber('RET-B');

    // Transaksi ACID
    const result = await prisma.$transaction(async (tx) => {
      // 1. Pastikan stok fisik barang di gudang mencukupi sebelum dikembalikan ke supplier
      for (const item of returnItemsPayload) {
        const product = await tx.product.findUniqueOrThrow({
          where: { id: item.productId },
        });

        if (product.currentStock.lessThan(item.baseQuantity)) {
          throw new ApiError(
            400,
            `Stok fisik gudang untuk "${product.name}" tidak mencukupi untuk diretur ke supplier. Stok tersedia: ${product.currentStock} ${product.baseUnit}, dibutuhkan: ${item.baseQuantity} ${product.baseUnit}.`,
            'INSUFFICIENT_STOCK_FOR_RETURN'
          );
        }

        const currentStock = product.currentStock;
        const newStock = currentStock.minus(item.baseQuantity);

        await tx.product.update({
          where: { id: item.productId },
          data: { currentStock: newStock },
        });

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: 'OUT',
            quantity: item.baseQuantity,
            previousStock: currentStock,
            currentStock: newStock,
            referenceType: 'PURCHASE_RETURN',
            referenceId: returnNumber,
            note: `Retur Pembelian ke Supplier ${purchase.supplier.name} (${item.quantity} ${item.unitName})`,
            userId,
          },
        });
      }

      // 2. Buat record PurchaseReturn
      const purchaseReturn = await tx.purchaseReturn.create({
        data: {
          returnNumber,
          purchaseId: purchase.id,
          supplierId: purchase.supplierId,
          userId,
          reason: data.reason,
          refundMethod: data.refundMethod,
          totalAmount: calculatedTotalAmount,
          items: {
            create: returnItemsPayload,
          },
        },
        include: {
          items: {
            include: {
              product: { select: { id: true, name: true, sku: true } },
            },
          },
          purchase: {
            select: { id: true, purchaseNumber: true },
          },
          supplier: {
            select: { id: true, name: true },
          },
          user: {
            select: { id: true, name: true },
          },
        },
      });

      // 3. Jika DEBT_OFFSET dan pembelian tempo masih memiliki hutang belum lunas
      if (data.refundMethod === 'DEBT_OFFSET' && purchase.paymentType === 'TEMPO') {
        const remainingDebt = Number(purchase.totalAmount) - Number(purchase.amountPaid);
        if (remainingDebt > 0) {
          const deduction = Math.min(remainingDebt, Number(calculatedTotalAmount));
          const newAmountPaid = Number(purchase.amountPaid) + deduction;
          const newStatus = newAmountPaid >= Number(purchase.totalAmount) ? 'PAID' : 'PARTIAL';

          await tx.purchase.update({
            where: { id: purchase.id },
            data: {
              amountPaid: new Prisma.Decimal(newAmountPaid),
              paymentStatus: newStatus,
            },
          });

          await tx.purchasePayment.create({
            data: {
              purchaseId: purchase.id,
              userId,
              amount: new Prisma.Decimal(deduction),
              paymentMethod: 'CASH',
              note: `Pemotongan Hutang Retur Barang No. ${returnNumber}`,
            },
          });
        }
      }

      return purchaseReturn;
    });

    return {
      ...result,
      totalAmount: Number(result.totalAmount),
      items: result.items.map((i) => ({
        ...i,
        quantity: Number(i.quantity),
        baseQuantity: Number(i.baseQuantity),
        conversionFactor: Number(i.conversionFactor),
        cost: Number(i.cost),
        subtotal: Number(i.subtotal),
      })),
    };
  }

  /**
   * Riwayat Retur Penjualan
   */
  static async getSaleReturns(params: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
    search?: string;
  }) {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 20;
    const { startDate, endDate, search } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.SaleReturnWhereInput = {};

    if (search) {
      where.OR = [
        { returnNumber: { contains: search } },
        { order: { invoiceNumber: { contains: search } } },
      ];
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(`${startDate}T00:00:00.000Z`);
      if (endDate) where.createdAt.lte = new Date(`${endDate}T23:59:59.999Z`);
    }

    const [returns, total] = await Promise.all([
      prisma.saleReturn.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          order: {
            select: { id: true, invoiceNumber: true, customer: { select: { id: true, name: true } } },
          },
          user: { select: { id: true, name: true } },
          items: {
            include: {
              product: { select: { id: true, name: true, sku: true } },
            },
          },
        },
      }),
      prisma.saleReturn.count({ where }),
    ]);

    return {
      returns: returns.map((r) => ({
        ...r,
        totalAmount: Number(r.totalAmount),
        items: r.items.map((i) => ({
          ...i,
          quantity: Number(i.quantity),
          baseQuantity: Number(i.baseQuantity),
          conversionFactor: Number(i.conversionFactor),
          price: Number(i.price),
          subtotal: Number(i.subtotal),
        })),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Riwayat Retur Pembelian Supplier
   */
  static async getPurchaseReturns(params: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
    search?: string;
  }) {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 20;
    const { startDate, endDate, search } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.PurchaseReturnWhereInput = {};

    if (search) {
      where.OR = [
        { returnNumber: { contains: search } },
        { purchase: { purchaseNumber: { contains: search } } },
        { supplier: { name: { contains: search } } },
      ];
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(`${startDate}T00:00:00.000Z`);
      if (endDate) where.createdAt.lte = new Date(`${endDate}T23:59:59.999Z`);
    }

    const [returns, total] = await Promise.all([
      prisma.purchaseReturn.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          purchase: { select: { id: true, purchaseNumber: true } },
          supplier: { select: { id: true, name: true } },
          user: { select: { id: true, name: true } },
          items: {
            include: {
              product: { select: { id: true, name: true, sku: true } },
            },
          },
        },
      }),
      prisma.purchaseReturn.count({ where }),
    ]);

    return {
      returns: returns.map((r) => ({
        ...r,
        totalAmount: Number(r.totalAmount),
        items: r.items.map((i) => ({
          ...i,
          quantity: Number(i.quantity),
          baseQuantity: Number(i.baseQuantity),
          conversionFactor: Number(i.conversionFactor),
          cost: Number(i.cost),
          subtotal: Number(i.subtotal),
        })),
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
