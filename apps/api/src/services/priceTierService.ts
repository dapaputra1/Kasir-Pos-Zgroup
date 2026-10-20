import { prisma } from '../config/prisma';

export interface PriceTierInput {
  minQuantity: number;
  price: number;
  label?: string;
}

export class PriceTierService {
  /**
   * Get all price tiers for a specific product unit
   */
  static async getTiersByUnit(productUnitId: number) {
    return prisma.priceTier.findMany({
      where: { productUnitId },
      orderBy: { minQuantity: 'asc' },
    });
  }

  /**
   * Save / overwrite price tiers for a product unit
   */
  static async saveTiers(productUnitId: number, tiers: PriceTierInput[]) {
    const unit = await prisma.productUnit.findUnique({
      where: { id: productUnitId },
      include: { product: true },
    });

    if (!unit) {
      const error: any = new Error(`Satuan produk dengan ID ${productUnitId} tidak ditemukan.`);
      error.statusCode = 404;
      throw error;
    }

    // Validate tier parameters
    for (const t of tiers) {
      if (t.minQuantity <= 1) {
        const error: any = new Error('Minimal kuantitas tier grosir harus lebih dari 1 unit.');
        error.statusCode = 400;
        throw error;
      }
      if (t.price < 0) {
        const error: any = new Error('Harga tier diskon tidak boleh negatif.');
        error.statusCode = 400;
        throw error;
      }
    }

    return prisma.$transaction(async (tx) => {
      // Clear existing tiers
      await tx.priceTier.deleteMany({
        where: { productUnitId },
      });

      // Insert new tiers
      for (const t of tiers) {
        await tx.priceTier.create({
          data: {
            productUnitId,
            minQuantity: t.minQuantity,
            price: t.price,
            label: t.label || `Grosir Tier (≥ ${t.minQuantity} ${unit.unitName})`,
          },
        });
      }

      return tx.priceTier.findMany({
        where: { productUnitId },
        orderBy: { minQuantity: 'asc' },
      });
    });
  }

  /**
   * Delete a single price tier
   */
  static async deleteTier(id: number) {
    return prisma.priceTier.delete({
      where: { id },
    });
  }
}
