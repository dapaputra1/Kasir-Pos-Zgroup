import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { CheckoutInput, OrderQueryInput } from '../validations/orderValidation';

export class PosService {
  /**
   * Scan product by Barcode or SKU
   * Detects:
   * 1. ProductUnit-level barcodes (e.g., carton barcode vs piece barcode)
   * 2. Product-level barcodes
   * 3. SKU codes (case-insensitive)
   * 4. EAN-13 / UPC-A format padding/unpadding (0-prefix normalization)
   */
  static async scanBarcode(code: string) {
    const rawCode = (code || '').trim();
    if (!rawCode) {
      const error: any = new Error('Kode barcode atau SKU tidak boleh kosong.');
      error.statusCode = 400;
      throw error;
    }

    // Generate candidate codes (exact, uppercase, trimmed, and UPC/EAN variants)
    const candidateCodes = new Set<string>();
    candidateCodes.add(rawCode);
    candidateCodes.add(rawCode.toUpperCase());
    candidateCodes.add(rawCode.toLowerCase());

    // UPC-A (12 digits) <-> EAN-13 (13 digits with leading 0)
    if (rawCode.length === 13 && rawCode.startsWith('0')) {
      candidateCodes.add(rawCode.substring(1));
    }
    if (rawCode.length === 12) {
      candidateCodes.add('0' + rawCode);
    }

    const codeList = Array.from(candidateCodes);

    // 1. Search if barcode matches a specific productUnit barcode
    const matchedUnit = await prisma.productUnit.findFirst({
      where: {
        barcode: { in: codeList },
      },
      include: {
        priceTiers: { orderBy: { minQuantity: 'asc' } },
        product: {
          include: {
            category: true,
            units: {
              include: { priceTiers: { orderBy: { minQuantity: 'asc' } } },
              orderBy: { conversionFactor: 'asc' },
            },
            bundleParents: {
              include: {
                componentProduct: {
                  select: { id: true, name: true, sku: true, baseUnit: true, currentStock: true },
                },
              },
            },
          },
        },
      },
    });

    if (matchedUnit) {
      if (!matchedUnit.product.isActive) {
        const error: any = new Error(
          `Barang "${matchedUnit.product.name}" saat ini berstatus non-aktif.`
        );
        error.statusCode = 400;
        throw error;
      }

      return {
        product: matchedUnit.product,
        matchedUnit: matchedUnit,
        scanType: 'UNIT_MATCH',
      };
    }

    // 2. Search if matches product barcode OR product SKU
    const product = await prisma.product.findFirst({
      where: {
        OR: [
          { barcode: { in: codeList } },
          { sku: { in: codeList } },
        ],
      },
      include: {
        category: true,
        units: {
          include: { priceTiers: { orderBy: { minQuantity: 'asc' } } },
          orderBy: { conversionFactor: 'asc' },
        },
        bundleParents: {
          include: {
            componentProduct: {
              select: { id: true, name: true, sku: true, baseUnit: true, currentStock: true },
            },
          },
        },
      },
    });

    if (product) {
      if (!product.isActive) {
        const error: any = new Error(
          `Barang "${product.name}" saat ini berstatus non-aktif.`
        );
        error.statusCode = 400;
        throw error;
      }

      // Check if any specific unit has the matching barcode, otherwise default to base unit
      const unitWithBarcode = product.units.find(
        (u) => u.barcode && candidateCodes.has(u.barcode)
      );
      const baseUnit =
        unitWithBarcode ||
        product.units.find((u) => u.isBaseUnit) ||
        product.units[0];

      return {
        product,
        matchedUnit: baseUnit || null,
        scanType: 'PRODUCT_MATCH',
      };
    }

    const error: any = new Error(`Barang dengan barcode atau SKU '${rawCode}' tidak ditemukan.`);
    error.statusCode = 404;
    error.code = 'PRODUCT_NOT_FOUND';
    throw error;
  }

  /**
   * Search active products for POS catalog
   */
  static async searchPosProducts(query?: string, categoryId?: number) {
    const where: Prisma.ProductWhereInput = {
      isActive: true,
    };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (query && query.trim()) {
      const term = query.trim();
      where.OR = [
        { name: { contains: term } },
        { sku: { contains: term } },
        { barcode: { contains: term } },
        { units: { some: { barcode: { contains: term } } } },
      ];
    }

    return prisma.product.findMany({
      where,
      take: 50,
      include: {
        category: { select: { id: true, code: true, name: true } },
        units: {
          include: { priceTiers: { orderBy: { minQuantity: 'asc' } } },
          orderBy: { conversionFactor: 'asc' },
        },
        bundleParents: {
          include: {
            componentProduct: {
              select: { id: true, name: true, sku: true, baseUnit: true, currentStock: true },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Process Checkout Transaction with ACID guarantee, double-deduction prevention,
   * price snapshots, and automated stock audit trails.
   */
  static async checkout(input: CheckoutInput, userId: number) {
    if (!input.items || input.items.length === 0) {
      const error: any = new Error('Keranjang belanja kosong.');
      error.statusCode = 400;
      throw error;
    }

    // Run within a Prisma ACID transaction
    return prisma.$transaction(async (tx) => {
      // 0. Fetch current user and verify permissions
      const currentUser = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, role: true },
      });

      // Optional active customer verification
      let customer = null;
      if (input.customerId) {
        customer = await tx.customer.findUnique({
          where: { id: input.customerId },
        });
        if (!customer) {
          const error: any = new Error('Data pelanggan yang dipilih tidak ditemukan.');
          error.statusCode = 404;
          throw error;
        }
        if (!customer.isActive) {
          const error: any = new Error(`Pelanggan "${customer.name}" sedang berstatus non-aktif.`);
          error.statusCode = 400;
          throw error;
        }
      }

      // 1. Generate daily sequence invoice number: INV-YYYYMMDD-XXXX (safely query highest sequence)
      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, ''); // e.g. "20261019"
      
      const lastOrderToday = await tx.order.findFirst({
        where: {
          invoiceNumber: { startsWith: `INV-${dateStr}-` },
        },
        orderBy: { invoiceNumber: 'desc' },
        select: { invoiceNumber: true },
      });

      let nextSeq = 1;
      if (lastOrderToday) {
        const parts = lastOrderToday.invoiceNumber.split('-');
        if (parts.length >= 3) {
          const lastSeq = parseInt(parts[2], 10);
          if (!isNaN(lastSeq)) {
            nextSeq = lastSeq + 1;
          }
        }
      }

      const sequence = String(nextSeq).padStart(4, '0');
      const invoiceNumber = `INV-${dateStr}-${sequence}`;

      // 2. Process each item: validate stock & prepare snapshots
      let subtotal = 0;
      const orderItemsData: any[] = [];
      const stockMovementData: any[] = [];

      for (const item of input.items) {
        // Fetch current product state with units, price tiers, and bundle components
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          include: {
            units: {
              include: {
                priceTiers: { orderBy: { minQuantity: 'desc' } },
              },
            },
            bundleParents: {
              include: {
                componentProduct: true,
              },
            },
          },
        });

        if (!product || !product.isActive) {
          throw new Error(`Produk dengan ID ${item.productId} tidak ditemukan atau dinonaktifkan.`);
        }

        // Determine unit
        let unit = product.units.find((u) => u.id === item.productUnitId);
        if (!unit) {
          // Fallback to base unit
          unit = product.units.find((u) => u.isBaseUnit) || product.units[0];
        }

        const conversionFactor = unit ? Number(unit.conversionFactor) : 1;
        const unitName = unit ? unit.unitName : product.baseUnit;
        const itemQuantity = Number(item.quantity);
        const baseQuantity = itemQuantity * conversionFactor;

        // Determine standard catalog price for customer tier & volume tier
        let standardPrice = Number(unit?.price || 0);

        if (customer?.tier === 'GROSIR' && unit?.wholesalePrice && Number(unit.wholesalePrice) > 0) {
          standardPrice = Number(unit.wholesalePrice);
        }

        if (unit?.priceTiers && unit.priceTiers.length > 0) {
          const matchingTier = unit.priceTiers.find((t) => itemQuantity >= Number(t.minQuantity));
          if (matchingTier) {
            standardPrice = Number(matchingTier.price);
          }
        }

        let unitPrice = standardPrice;

        // Custom price protection: Cashier cannot sell below base product cost without supervisor approval
        if (item.customPrice !== undefined && item.customPrice !== null) {
          const submittedPrice = Number(item.customPrice);
          const minAllowedCost = Number(product.purchasePrice) * conversionFactor;

          if (currentUser?.role === 'CASHIER' && submittedPrice < standardPrice) {
            if (submittedPrice < minAllowedCost) {
              const error: any = new Error(
                `Harga kustom untuk "${product.name}" (Rp ${submittedPrice.toLocaleString('id-ID')}) tidak boleh lebih rendah dari modal dasar (Rp ${minAllowedCost.toLocaleString('id-ID')}) tanpa otorisasi supervisor.`
              );
              error.statusCode = 400;
              error.code = 'PRICE_BELOW_COST';
              throw error;
            }
          }
          unitPrice = submittedPrice;
        }

        const itemSubtotal = itemQuantity * unitPrice;
        subtotal += itemSubtotal;

        let costPriceSnapshot = Number(product.purchasePrice) * conversionFactor;

        // Stock deduction: Paket Bundling vs Regular Product
        if (product.isBundle && product.bundleParents && product.bundleParents.length > 0) {
          let calculatedBundleHpp = 0;

          // Deduct stock atomically from each component product
          for (const comp of product.bundleParents) {
            const compProduct = comp.componentProduct;
            const reqQty = Number(comp.quantity) * itemQuantity; // Jumlah dasar yg dibutuhkan
            const compStock = Number(compProduct.currentStock);
            const compHpp = Number(compProduct.purchasePrice);

            calculatedBundleHpp += compHpp * Number(comp.quantity);

            if (compStock < reqQty) {
              const error: any = new Error(
                `Stok komponen "${compProduct.name}" tidak mencukupi untuk paket "${product.name}". Stok tersedia: ${compStock} ${compProduct.baseUnit}, dibutuhkan: ${reqQty} ${compProduct.baseUnit} (${itemQuantity} paket).`
              );
              error.statusCode = 400;
              error.code = 'INSUFFICIENT_STOCK';
              throw error;
            }

            const newCompStock = compStock - reqQty;

            await tx.product.update({
              where: { id: compProduct.id },
              data: { currentStock: { decrement: reqQty } },
            });

            stockMovementData.push({
              productId: compProduct.id,
              type: 'OUT' as const,
              quantity: reqQty,
              previousStock: compStock,
              currentStock: newCompStock,
              referenceType: 'SALE',
              referenceId: invoiceNumber,
              note: `Komponen paket "${product.name}" (${itemQuantity} paket)`,
              userId: userId,
            });
          }

          if (costPriceSnapshot === 0 && calculatedBundleHpp > 0) {
            costPriceSnapshot = calculatedBundleHpp * conversionFactor;
          }
        } else {
          // Regular product stock deduction
          const currentStock = Number(product.currentStock);

          // Strict stock validation
          if (currentStock < baseQuantity) {
            const error: any = new Error(
              `Stok tidak mencukupi untuk "${product.name}". Stok tersedia: ${currentStock} ${product.baseUnit}, dibutuhkan: ${baseQuantity} ${product.baseUnit} (${itemQuantity} ${unitName}).`
            );
            error.statusCode = 400;
            error.code = 'INSUFFICIENT_STOCK';
            throw error;
          }

          const newStock = currentStock - baseQuantity;

          // Update product stock atomically with decrement
          await tx.product.update({
            where: { id: product.id },
            data: {
              currentStock: { decrement: baseQuantity },
            },
          });

          // Prepare audit trail stock movement
          stockMovementData.push({
            productId: product.id,
            type: 'OUT' as const,
            quantity: baseQuantity,
            previousStock: currentStock,
            currentStock: newStock,
            referenceType: 'SALE',
            referenceId: invoiceNumber,
            note: `Penjualan Kasir (${itemQuantity} ${unitName})`,
            userId: userId,
          });
        }

        // Prepare order item snapshot
        orderItemsData.push({
          productId: product.id,
          productUnitId: unit?.id || null,
          productName: product.name,
          sku: product.sku,
          unitName: unitName,
          conversionFactor: conversionFactor,
          quantity: itemQuantity,
          baseQuantity: baseQuantity,
          costPrice: costPriceSnapshot,
          unitPrice: unitPrice,
          subtotal: itemSubtotal,
          discountAmount: 0,
          totalAmount: itemSubtotal,
        });
      }

      // 3. Coupon Promotion atomic application & discount calculation
      let discount = 0;
      let appliedPromoCode: string | null = null;

      if (input.promoCode && input.promoCode.trim()) {
        const cleanCode = input.promoCode.trim().toUpperCase();
        const promo = await tx.promotion.findUnique({
          where: { code: cleanCode },
        });

        if (!promo || !promo.isActive) {
          const error: any = new Error(`Kupon promo "${cleanCode}" tidak valid atau tidak aktif.`);
          error.statusCode = 400;
          throw error;
        }

        const now = new Date();
        if (promo.startDate && now < promo.startDate) {
          const error: any = new Error(`Promo "${promo.name}" belum mulai berlaku.`);
          error.statusCode = 400;
          throw error;
        }
        if (promo.endDate && now > promo.endDate) {
          const error: any = new Error(`Promo "${promo.name}" telah kedaluwarsa.`);
          error.statusCode = 400;
          throw error;
        }
        if (promo.quota !== null && promo.quota !== undefined && promo.usedCount >= promo.quota) {
          const error: any = new Error(`Batas kuota promo "${cleanCode}" sudah habis.`);
          error.statusCode = 400;
          throw error;
        }

        const minSpend = Number(promo.minPurchase || 0);
        if (subtotal < minSpend) {
          const error: any = new Error(
            `Total belanja minimal Rp ${minSpend.toLocaleString('id-ID')} untuk menggunakan kupon "${cleanCode}".`
          );
          error.statusCode = 400;
          throw error;
        }

        let promoDiscount = 0;
        const promoVal = Number(promo.value);

        if (promo.type === 'PERCENTAGE') {
          promoDiscount = (subtotal * promoVal) / 100;
          if (promo.maxDiscount) {
            promoDiscount = Math.min(promoDiscount, Number(promo.maxDiscount));
          }
        } else {
          promoDiscount = Math.min(promoVal, subtotal);
        }

        promoDiscount = Math.round(promoDiscount);
        discount = promoDiscount;
        appliedPromoCode = promo.code;

        // Atomically increment promo usage counter
        await tx.promotion.update({
          where: { id: promo.id },
          data: { usedCount: { increment: 1 } },
        });
      } else if (input.discountAmount && Number(input.discountAmount) > 0) {
        const manualDiscount = Number(input.discountAmount);
        // Manual discount without promo code is restricted for CASHIER role to max 10%
        if (currentUser?.role === 'CASHIER' && manualDiscount > subtotal * 0.1) {
          const error: any = new Error(
            'Diskon manual kasir melebihi batas toleransi maksimal (10%). Butuh otorisasi supervisor/Admin.'
          );
          error.statusCode = 400;
          error.code = 'UNAUTHORIZED_DISCOUNT';
          throw error;
        }
        discount = Math.min(manualDiscount, subtotal);
      }

      const tax = Number(input.taxAmount) || 0;
      const totalAmount = Math.max(0, subtotal - discount + tax);
      let amountPaid = Number(input.amountPaid);

      // Validate payment amount for CASH
      if (input.paymentMethod === 'CASH' && amountPaid < totalAmount) {
        const error: any = new Error(
          `Pembayaran tunai kurang. Total tagihan: Rp ${totalAmount.toLocaleString('id-ID')}, uang diterima: Rp ${amountPaid.toLocaleString('id-ID')}.`
        );
        error.statusCode = 400;
        error.code = 'INSUFFICIENT_PAYMENT';
        throw error;
      }

      // Validate payment amount for Non-cash instant payment methods (TRANSFER, QRIS)
      if (input.paymentMethod === 'TRANSFER' || input.paymentMethod === 'QRIS') {
        if (amountPaid < totalAmount) {
          const error: any = new Error(
            `Pembayaran ${input.paymentMethod} belum mencukupi. Total tagihan: Rp ${totalAmount.toLocaleString('id-ID')}, uang diterima: Rp ${amountPaid.toLocaleString('id-ID')}.`
          );
          error.statusCode = 400;
          error.code = 'INSUFFICIENT_PAYMENT';
          throw error;
        }
      }

      const changeAmount = input.paymentMethod === 'CASH' ? Math.max(0, amountPaid - totalAmount) : 0;
      if (input.paymentMethod === 'CASH') {
        amountPaid = totalAmount; // Record exact paid for cash accounting
      }

      // Determine payment status and due date for TEMPO
      let paymentStatus: 'PAID' | 'UNPAID' | 'PARTIAL' = 'PAID';
      let dueDate: Date | null = null;

      if (input.paymentMethod === 'TEMPO') {
        // Enforce mandatory registered customer for TEMPO credit transactions
        if (!input.customerId || !customer) {
          const error: any = new Error(
            'Transaksi TEMPO (bon/piutang) wajib memilih data pelanggan terdaftar agar piutang tercatat dengan sah.'
          );
          error.statusCode = 400;
          error.code = 'CUSTOMER_REQUIRED_FOR_CREDIT';
          throw error;
        }

        const d = new Date();
        d.setDate(d.getDate() + 14); // Default 14 days tempo
        dueDate = d;

        if (amountPaid >= totalAmount) {
          paymentStatus = 'PAID';
        } else if (amountPaid > 0) {
          paymentStatus = 'PARTIAL';
        } else {
          paymentStatus = 'UNPAID';
        }

        // Credit Limit verification
        if (customer && Number(customer.creditLimit) > 0) {
          const currentDebtOrders = await tx.order.findMany({
            where: {
              customerId: customer.id,
              paymentMethod: 'TEMPO',
              paymentStatus: { in: ['UNPAID', 'PARTIAL'] },
              status: 'COMPLETED',
            },
            select: { totalAmount: true, amountPaid: true },
          });

          const currentDebt = currentDebtOrders.reduce((acc, curr) => {
            const rem = Number(curr.totalAmount) - Number(curr.amountPaid);
            return acc + (rem > 0 ? rem : 0);
          }, 0);

          const newDebt = totalAmount - amountPaid;
          if (currentDebt + newDebt > Number(customer.creditLimit)) {
            const error: any = new Error(
              `Plafon piutang pelanggan "${customer.name}" terlampaui. Batas kredit: Rp ${Number(customer.creditLimit).toLocaleString('id-ID')}, total piutang berjalan jika transaksi dilanjutkan: Rp ${(currentDebt + newDebt).toLocaleString('id-ID')}.`
            );
            error.statusCode = 400;
            error.code = 'CREDIT_LIMIT_EXCEEDED';
            throw error;
          }
        }
      }

      // 4. Check active cash shift for cashier
      const activeShift = await tx.cashShift.findFirst({
        where: { userId, status: 'OPEN' },
      });

      // 5. Create Order
      const order = await tx.order.create({
        data: {
          invoiceNumber,
          userId,
          customerId: input.customerId || null,
          cashShiftId: activeShift ? activeShift.id : null,
          subtotal,
          discountAmount: discount,
          promoCode: appliedPromoCode,
          taxAmount: tax,
          totalAmount,
          paymentMethod: input.paymentMethod,
          paymentStatus,
          dueDate,
          amountPaid,
          changeAmount,
          status: 'COMPLETED',
          notes: input.notes || null,
          items: {
            create: orderItemsData,
          },
        },
        include: {
          items: true,
          user: { select: { id: true, name: true, role: true } },
          customer: true,
        },
      });

      // If initial payment was made on tempo order, record it in OrderPayment
      if (input.paymentMethod === 'TEMPO' && amountPaid > 0) {
        await tx.orderPayment.create({
          data: {
            orderId: order.id,
            userId,
            amount: new Prisma.Decimal(amountPaid.toString()),
            paymentDate: new Date(),
            paymentMethod: 'CASH',
            note: 'Uang muka (DP) belanja tempo',
          },
        });
      }

      // 5. Create Stock Movement audit trails
      for (const sm of stockMovementData) {
        await tx.stockMovement.create({ data: sm });
      }

      return order;
    });
  }

  /**
   * Get single order by ID or Invoice Number for receipt printing
   */
  static async getOrderById(id: number) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        user: { select: { id: true, name: true, role: true } },
        customer: true,
      },
    });

    if (!order) {
      const error: any = new Error('Transaksi penjualan tidak ditemukan.');
      error.statusCode = 404;
      error.code = 'ORDER_NOT_FOUND';
      throw error;
    }

    return order;
  }

  /**
   * List sales history with filters and summary totals
   */
  static async listOrders(query: OrderQueryInput) {
    const {
      search,
      startDate,
      endDate,
      paymentMethod,
      status,
      userId,
    } = query;
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;

    const skip = (page - 1) * limit;
    const where: Prisma.OrderWhereInput = {};

    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { invoiceNumber: { contains: term } },
        { customer: { name: { contains: term } } },
        { notes: { contains: term } },
      ];
    }

    if (paymentMethod) {
      where.paymentMethod = paymentMethod;
    }

    if (status) {
      where.status = status;
    }

    if (userId) {
      where.userId = userId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(`${startDate}T00:00:00.000Z`);
      }
      if (endDate) {
        where.createdAt.lte = new Date(`${endDate}T23:59:59.999Z`);
      }
    }

    const [total, orders, aggregates] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, role: true } },
          customer: { select: { id: true, code: true, name: true, phone: true } },
          _count: { select: { items: true } },
        },
      }),
      prisma.order.aggregate({
        where,
        _sum: {
          totalAmount: true,
          subtotal: true,
          discountAmount: true,
        },
      }),
    ]);

    return {
      items: orders,
      summary: {
        totalRevenue: aggregates._sum.totalAmount || 0,
        totalOrders: total,
      },
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
