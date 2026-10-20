import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { CreatePurchaseInput, PurchasePaymentInput, PurchaseQueryInput } from '../validations/purchaseValidation';

export class PurchaseService {
  /**
   * Generate next purchase invoice number: PB-YYYYMMDD-XXXX
   */
  private static async generateInvoiceNumber(tx: Prisma.TransactionClient): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
    const prefix = `PB-${dateStr}-`;

    const lastPurchase = await tx.purchase.findFirst({
      where: {
        purchaseNumber: { startsWith: prefix },
      },
      orderBy: { purchaseNumber: 'desc' },
      select: { purchaseNumber: true },
    });

    let sequence = 1;
    if (lastPurchase?.purchaseNumber) {
      const parts = lastPurchase.purchaseNumber.split('-');
      if (parts.length === 3) {
        const lastSeq = parseInt(parts[2], 10);
        if (!isNaN(lastSeq)) {
          sequence = lastSeq + 1;
        }
      }
    }

    return `${prefix}${String(sequence).padStart(4, '0')}`;
  }

  /**
   * Record new Purchase / Restock (ACID Transaction)
   */
  static async createPurchase(input: CreatePurchaseInput, userId: number) {
    return prisma.$transaction(
      async (tx) => {
        // 1. Verify supplier
        const supplier = await tx.supplier.findUnique({
          where: { id: input.supplierId },
        });

        if (!supplier) {
          const error: any = new Error('Supplier tidak ditemukan.');
          error.statusCode = 404;
          throw error;
        }

        if (!supplier.isActive) {
          const error: any = new Error('Supplier berstatus non-aktif. Tidak dapat menerima pesanan.');
          error.statusCode = 400;
          throw error;
        }

        // 2. Process and validate all purchase items
        const invoiceNumber = await this.generateInvoiceNumber(tx);
        let calculatedSubtotal = new Prisma.Decimal(0);

        interface PreparedItem {
          productId: number;
          productUnitId: number | null;
          productName: string;
          sku: string;
          unitName: string;
          conversionFactor: Prisma.Decimal;
          quantity: Prisma.Decimal;
          baseQuantity: Prisma.Decimal;
          unitCost: Prisma.Decimal;
          baseCost: Prisma.Decimal;
          subtotal: Prisma.Decimal;
          updateProductCost: boolean;
        }

        const preparedItems: PreparedItem[] = [];

        for (const item of input.items) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
            include: { units: true },
          });

          if (!product) {
            const error: any = new Error(`Produk ID ${item.productId} tidak ditemukan.`);
            error.statusCode = 404;
            throw error;
          }

          if (!product.isActive) {
            const error: any = new Error(`Produk "${product.name}" sedang non-aktif.`);
            error.statusCode = 400;
            throw error;
          }

          let unitName = product.baseUnit;
          let conversionFactor = new Prisma.Decimal(1);
          let productUnitId: number | null = null;

          if (item.productUnitId) {
            const matchedUnit = product.units.find((u) => u.id === item.productUnitId);
            if (!matchedUnit) {
              const error: any = new Error(
                `Satuan ID ${item.productUnitId} tidak valid untuk produk "${product.name}".`
              );
              error.statusCode = 400;
              throw error;
            }
            unitName = matchedUnit.unitName;
            conversionFactor = new Prisma.Decimal(matchedUnit.conversionFactor.toString());
            productUnitId = matchedUnit.id;
          }

          const qtyDec = new Prisma.Decimal(item.quantity.toString());
          const unitCostDec = new Prisma.Decimal(item.unitCost.toString());
          const baseQtyDec = qtyDec.mul(conversionFactor);
          // HPP per base unit = unitCost / conversionFactor
          const baseCostDec = unitCostDec.div(conversionFactor);
          const itemSubtotal = qtyDec.mul(unitCostDec);

          calculatedSubtotal = calculatedSubtotal.add(itemSubtotal);

          preparedItems.push({
            productId: product.id,
            productUnitId,
            productName: product.name,
            sku: product.sku,
            unitName,
            conversionFactor,
            quantity: qtyDec,
            baseQuantity: baseQtyDec,
            unitCost: unitCostDec,
            baseCost: baseCostDec,
            subtotal: itemSubtotal,
            updateProductCost: item.updateProductCost ?? true,
          });
        }

        // 3. Calculate financial totals
        const discountDec = new Prisma.Decimal((input.discountAmount || 0).toString());
        const taxDec = new Prisma.Decimal((input.taxAmount || 0).toString());
        const totalAmountDec = calculatedSubtotal.sub(discountDec).add(taxDec);

        if (totalAmountDec.lessThan(0)) {
          const error: any = new Error('Total nilai pembelian tidak boleh negatif.');
          error.statusCode = 400;
          throw error;
        }

        // 4. Payment determination
        let finalAmountPaid = new Prisma.Decimal(0);
        let paymentStatus: 'PAID' | 'UNPAID' | 'PARTIAL' = 'UNPAID';
        let dueDate: Date | null = null;

        if (input.paymentType === 'CASH') {
          finalAmountPaid = totalAmountDec;
          paymentStatus = 'PAID';
        } else {
          // TEMPO (Hutang Dagang)
          if (input.dueDate) {
            dueDate = new Date(input.dueDate);
          }
          if (input.amountPaid !== undefined && input.amountPaid > 0) {
            finalAmountPaid = new Prisma.Decimal(input.amountPaid.toString());
            if (finalAmountPaid.greaterThanOrEqualTo(totalAmountDec)) {
              paymentStatus = 'PAID';
            } else {
              paymentStatus = 'PARTIAL';
            }
          } else {
            paymentStatus = 'UNPAID';
          }
        }

        // 5. Create Purchase Header
        const purchaseDate = input.purchaseDate ? new Date(input.purchaseDate) : new Date();

        const purchase = await tx.purchase.create({
          data: {
            purchaseNumber: invoiceNumber,
            supplierInvoiceNo: input.supplierInvoiceNo?.trim() || null,
            supplierId: input.supplierId,
            userId,
            purchaseDate,
            paymentType: input.paymentType,
            paymentStatus,
            dueDate,
            subtotal: calculatedSubtotal,
            discountAmount: discountDec,
            taxAmount: taxDec,
            totalAmount: totalAmountDec,
            amountPaid: finalAmountPaid,
            status: 'RECEIVED',
            notes: input.notes?.trim() || null,
            items: {
              create: preparedItems.map((item) => ({
                productId: item.productId,
                productUnitId: item.productUnitId,
                productName: item.productName,
                sku: item.sku,
                unitName: item.unitName,
                conversionFactor: item.conversionFactor,
                quantity: item.quantity,
                baseQuantity: item.baseQuantity,
                unitCost: item.unitCost,
                baseCost: item.baseCost,
                subtotal: item.subtotal,
              })),
            },
          },
          include: {
            items: true,
            supplier: true,
            user: { select: { id: true, name: true, email: true, role: true } },
          },
        });

        // 6. Record payment history if initial payment made
        if (finalAmountPaid.greaterThan(0)) {
          await tx.purchasePayment.create({
            data: {
              purchaseId: purchase.id,
              userId,
              amount: finalAmountPaid,
              paymentDate: purchaseDate,
              paymentMethod: input.paymentType === 'CASH' ? 'CASH' : 'TRANSFER',
              note: input.paymentType === 'CASH' ? 'Pembayaran lunas tunai saat barang datang' : 'Uang muka (DP) pembelian tempo',
            },
          });
        }

        // 7. Update Inventory Stock and Create StockMovement Audit Trail
        for (const item of preparedItems) {
          const currentProd = await tx.product.findUniqueOrThrow({
            where: { id: item.productId },
            select: { currentStock: true, purchasePrice: true },
          });

          const prevStock = new Prisma.Decimal(currentProd.currentStock.toString());
          const nextStock = prevStock.add(item.baseQuantity);

          const updateProductData: Prisma.ProductUpdateInput = {
            currentStock: nextStock,
          };

          if (item.updateProductCost) {
            updateProductData.purchasePrice = item.baseCost;
          }

          await tx.product.update({
            where: { id: item.productId },
            data: updateProductData,
          });

          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              type: 'IN',
              quantity: item.baseQuantity,
              previousStock: prevStock,
              currentStock: nextStock,
              referenceType: 'PURCHASE',
              referenceId: invoiceNumber,
              note: `Kulakan ${item.quantity} ${item.unitName} (${item.baseQuantity} base unit) dari ${supplier.name}`,
              userId,
            },
          });
        }

        return purchase;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: 10000,
      }
    );
  }

  /**
   * Record debt repayment for a tempo purchase
   */
  static async recordPayment(purchaseId: number, input: PurchasePaymentInput, userId: number) {
    return prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.findUnique({
        where: { id: purchaseId },
        include: { supplier: true },
      });

      if (!purchase) {
        const error: any = new Error('Faktur pembelian tidak ditemukan.');
        error.statusCode = 404;
        throw error;
      }

      if (purchase.status === 'CANCELLED') {
        const error: any = new Error('Faktur pembelian ini sudah dibatalkan.');
        error.statusCode = 400;
        throw error;
      }

      const totalAmount = new Prisma.Decimal(purchase.totalAmount.toString());
      const currentPaid = new Prisma.Decimal(purchase.amountPaid.toString());
      const remainingDebt = totalAmount.sub(currentPaid);

      if (remainingDebt.lessThanOrEqualTo(0)) {
        const error: any = new Error('Faktur pembelian ini sudah lunas.');
        error.statusCode = 400;
        throw error;
      }

      const paymentDec = new Prisma.Decimal(input.amount.toString());
      if (paymentDec.greaterThan(remainingDebt)) {
        const error: any = new Error(
          `Nominal pembayaran (Rp ${Number(paymentDec).toLocaleString('id-ID')}) melebihi sisa hutang (Rp ${Number(remainingDebt).toLocaleString('id-ID')}).`
        );
        error.statusCode = 400;
        throw error;
      }

      const newPaid = currentPaid.add(paymentDec);
      const newStatus = newPaid.greaterThanOrEqualTo(totalAmount) ? 'PAID' : 'PARTIAL';

      // 1. Create Payment Log
      const paymentLog = await tx.purchasePayment.create({
        data: {
          purchaseId: purchase.id,
          userId,
          amount: paymentDec,
          paymentDate: new Date(),
          paymentMethod: input.paymentMethod,
          note: input.note?.trim() || `Pelunasan hutang kulakan (${newStatus === 'PAID' ? 'LUNAS' : 'CICILAN'})`,
        },
      });

      // 2. Update Purchase
      const updatedPurchase = await tx.purchase.update({
        where: { id: purchaseId },
        data: {
          amountPaid: newPaid,
          paymentStatus: newStatus,
        },
        include: {
          supplier: true,
          payments: { orderBy: { paymentDate: 'desc' } },
        },
      });

      return {
        purchase: updatedPurchase,
        payment: paymentLog,
      };
    });
  }

  /**
   * List Purchases with filters & pagination
   */
  static async listPurchases(query: PurchaseQueryInput) {
    const {
      search,
      supplierId,
      paymentType,
      paymentStatus,
      status,
      startDate,
      endDate,
    } = query;
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;

    const skip = (page - 1) * limit;
    const where: Prisma.PurchaseWhereInput = {};

    if (supplierId) {
      where.supplierId = supplierId;
    }

    if (paymentType) {
      where.paymentType = paymentType;
    }

    if (paymentStatus) {
      where.paymentStatus = paymentStatus;
    }

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.purchaseDate = {};
      if (startDate) {
        where.purchaseDate.gte = new Date(`${startDate}T00:00:00.000Z`);
      }
      if (endDate) {
        where.purchaseDate.lte = new Date(`${endDate}T23:59:59.999Z`);
      }
    }

    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { purchaseNumber: { contains: term } },
        { supplierInvoiceNo: { contains: term } },
        { supplier: { name: { contains: term } } },
        { notes: { contains: term } },
      ];
    }

    const [total, purchases] = await Promise.all([
      prisma.purchase.count({ where }),
      prisma.purchase.findMany({
        where,
        skip,
        take: limit,
        orderBy: { purchaseDate: 'desc' },
        include: {
          supplier: {
            select: { id: true, code: true, name: true, phone: true },
          },
          user: {
            select: { id: true, name: true, role: true },
          },
          _count: {
            select: { items: true, payments: true },
          },
        },
      }),
    ]);

    return {
      data: purchases,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single purchase detail with items and payments
   */
  static async getPurchaseById(id: number) {
    const purchase = await prisma.purchase.findUnique({
      where: { id },
      include: {
        supplier: true,
        user: { select: { id: true, name: true, email: true, role: true } },
        items: {
          include: {
            product: {
              select: { id: true, sku: true, name: true, baseUnit: true, currentStock: true },
            },
          },
        },
        payments: {
          orderBy: { paymentDate: 'desc' },
        },
      },
    });

    if (!purchase) {
      const error: any = new Error('Faktur pembelian tidak ditemukan.');
      error.statusCode = 404;
      throw error;
    }

    return purchase;
  }

  /**
   * Get dashboard metrics for purchase and supplier debts
   */
  static async getPurchaseSummary() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [monthlyPurchases, allTempoPurchases, totalSuppliers] = await Promise.all([
      prisma.purchase.aggregate({
        where: {
          purchaseDate: { gte: startOfMonth },
          status: 'RECEIVED',
        },
        _sum: { totalAmount: true },
        _count: { id: true },
      }),
      prisma.purchase.findMany({
        where: {
          paymentType: 'TEMPO',
          paymentStatus: { in: ['UNPAID', 'PARTIAL'] },
          status: 'RECEIVED',
        },
        select: {
          totalAmount: true,
          amountPaid: true,
          dueDate: true,
        },
      }),
      prisma.supplier.count({ where: { isActive: true } }),
    ]);

    let totalUnpaidDebt = 0;
    let dueSoonCount = 0;
    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

    for (const p of allTempoPurchases) {
      const remaining = Number(p.totalAmount) - Number(p.amountPaid);
      if (remaining > 0) {
        totalUnpaidDebt += remaining;
      }
      if (p.dueDate && new Date(p.dueDate) <= sevenDaysLater) {
        dueSoonCount++;
      }
    }

    return {
      monthlyTotalAmount: Number(monthlyPurchases._sum.totalAmount || 0),
      monthlyPurchaseCount: monthlyPurchases._count.id || 0,
      totalUnpaidDebt,
      tempoPurchasesCount: allTempoPurchases.length,
      dueSoonCount,
      activeSuppliersCount: totalSuppliers,
    };
  }
}
