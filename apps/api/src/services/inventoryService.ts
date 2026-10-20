import { Prisma, MovementType } from '@prisma/client';
import { prisma } from '../config/prisma';

export interface StockOpnameItemInput {
  productId: number;
  physicalStock: number;
  note?: string;
}

export class InventoryService {
  /**
   * List all stock movement audit logs with filters
   */
  static async listMovements(query: {
    productId?: number;
    type?: MovementType;
    referenceType?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const {
      productId,
      type,
      referenceType,
      startDate,
      endDate,
      search,
    } = query;
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;

    const skip = (page - 1) * limit;
    const where: Prisma.StockMovementWhereInput = {};

    if (productId) {
      where.productId = productId;
    }

    if (type) {
      where.type = type;
    }

    if (referenceType) {
      where.referenceType = referenceType;
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

    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { product: { name: { contains: term } } },
        { product: { sku: { contains: term } } },
        { referenceId: { contains: term } },
        { note: { contains: term } },
      ];
    }

    const [total, movements] = await Promise.all([
      prisma.stockMovement.count({ where }),
      prisma.stockMovement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          product: {
            select: {
              id: true,
              sku: true,
              name: true,
              baseUnit: true,
              category: { select: { id: true, name: true } },
            },
          },
          user: {
            select: { id: true, name: true, role: true },
          },
        },
      }),
    ]);

    return {
      data: movements,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Submit physical stock opname count and auto-adjust discrepancies
   */
  static async processStockOpname(items: StockOpnameItemInput[], userId: number) {
    if (!items || items.length === 0) {
      const error: any = new Error('Daftar barang opname tidak boleh kosong.');
      error.statusCode = 400;
      throw error;
    }

    return prisma.$transaction(async (tx) => {
      const adjustmentResults = [];

      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          const error: any = new Error(`Produk ID ${item.productId} tidak ditemukan.`);
          error.statusCode = 404;
          throw error;
        }

        const systemStock = Number(product.currentStock);
        const physicalStock = Number(item.physicalStock);
        const diff = physicalStock - systemStock;

        if (diff !== 0) {
          // Adjust stock to physical count
          await tx.product.update({
            where: { id: item.productId },
            data: { currentStock: new Prisma.Decimal(physicalStock.toString()) },
          });

          // Create audit movement
          const movement = await tx.stockMovement.create({
            data: {
              productId: item.productId,
              type: 'ADJUSTMENT',
              quantity: new Prisma.Decimal(Math.abs(diff).toString()),
              previousStock: new Prisma.Decimal(systemStock.toString()),
              currentStock: new Prisma.Decimal(physicalStock.toString()),
              referenceType: 'OPNAME',
              referenceId: `OPN-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
              note:
                item.note?.trim() ||
                `Opname Fisik: Fisik ${physicalStock} vs Sistem ${systemStock} (Selisih ${
                  diff > 0 ? '+' : ''
                }${diff} ${product.baseUnit})`,
              userId,
            },
          });

          adjustmentResults.push({
            productId: product.id,
            productName: product.name,
            systemStock,
            physicalStock,
            discrepancy: diff,
            movementId: movement.id,
          });
        }
      }

      return {
        totalChecked: items.length,
        totalAdjusted: adjustmentResults.length,
        adjustments: adjustmentResults,
      };
    });
  }
}
