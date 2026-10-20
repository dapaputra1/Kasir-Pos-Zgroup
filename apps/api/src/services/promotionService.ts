import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { CreatePromotionInput, UpdatePromotionInput } from '../validations/promotionValidation';

export class PromotionService {
  /**
   * List all promotions with optional search and active status filter
   */
  static async listPromotions(query: { search?: string; isActive?: boolean; page?: number; limit?: number }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 50;
    const skip = (page - 1) * limit;

    const where: Prisma.PromotionWhereInput = {};

    if (query.search && query.search.trim()) {
      const term = query.search.trim();
      where.OR = [
        { code: { contains: term } },
        { name: { contains: term } },
        { description: { contains: term } },
      ];
    }

    if (typeof query.isActive === 'boolean') {
      where.isActive = query.isActive;
    }

    const [total, promotions] = await Promise.all([
      prisma.promotion.count({ where }),
      prisma.promotion.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
      }),
    ]);

    return {
      promotions,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single promotion by ID
   */
  static async getPromotionById(id: number) {
    const promo = await prisma.promotion.findUnique({
      where: { id },
    });

    if (!promo) {
      const error: any = new Error(`Promosi dengan ID ${id} tidak ditemukan.`);
      error.statusCode = 404;
      throw error;
    }

    return promo;
  }

  /**
   * Create new promotional voucher
   */
  static async createPromotion(input: CreatePromotionInput) {
    // Check code uniqueness
    const existing = await prisma.promotion.findUnique({
      where: { code: input.code },
    });

    if (existing) {
      const error: any = new Error(`Kode promo "${input.code}" sudah digunakan. Gunakan kode unik lain.`);
      error.statusCode = 409;
      throw error;
    }

    return prisma.promotion.create({
      data: {
        code: input.code,
        name: input.name,
        description: input.description || null,
        type: input.type,
        value: input.value,
        minPurchase: input.minPurchase ?? 0,
        maxDiscount: input.maxDiscount ?? null,
        quota: input.quota ?? null,
        startDate: input.startDate ? new Date(input.startDate) : null,
        endDate: input.endDate ? new Date(input.endDate) : null,
        isActive: input.isActive ?? true,
      },
    });
  }

  /**
   * Update existing promotion
   */
  static async updatePromotion(id: number, input: UpdatePromotionInput) {
    await this.getPromotionById(id);

    if (input.code) {
      const existing = await prisma.promotion.findFirst({
        where: {
          code: input.code,
          id: { not: id },
        },
      });

      if (existing) {
        const error: any = new Error(`Kode promo "${input.code}" sudah digunakan.`);
        error.statusCode = 409;
        throw error;
      }
    }

    const data: any = { ...input };
    if (input.startDate) data.startDate = new Date(input.startDate);
    if (input.endDate) data.endDate = new Date(input.endDate);

    return prisma.promotion.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete promotion voucher
   */
  static async deletePromotion(id: number) {
    await this.getPromotionById(id);
    return prisma.promotion.delete({
      where: { id },
    });
  }

  /**
   * Validate and calculate coupon discount for POS cart
   */
  static async validateCoupon(code: string, subtotal: number) {
    const cleanCode = code.trim().toUpperCase();
    const promo = await prisma.promotion.findUnique({
      where: { code: cleanCode },
    });

    if (!promo || !promo.isActive) {
      const error: any = new Error(`Kupon promo "${cleanCode}" tidak valid atau sedang tidak aktif.`);
      error.statusCode = 400;
      throw error;
    }

    const now = new Date();

    if (promo.startDate && now < promo.startDate) {
      const error: any = new Error(`Promo "${promo.name}" baru berlaku mulai ${promo.startDate.toLocaleDateString('id-ID')}.`);
      error.statusCode = 400;
      throw error;
    }

    if (promo.endDate && now > promo.endDate) {
      const error: any = new Error(`Promo "${promo.name}" telah berakhir pada ${promo.endDate.toLocaleDateString('id-ID')}.`);
      error.statusCode = 400;
      throw error;
    }

    if (promo.quota !== null && promo.quota !== undefined && promo.usedCount >= promo.quota) {
      const error: any = new Error(`Kuota penggunaan voucher promo "${cleanCode}" sudah habis.`);
      error.statusCode = 400;
      throw error;
    }

    const minSpend = Number(promo.minPurchase || 0);
    if (subtotal < minSpend) {
      const error: any = new Error(
        `Belanja belum memenuhi syarat minimal Rp ${minSpend.toLocaleString('id-ID')} untuk menggunakan promo ini.`
      );
      error.statusCode = 400;
      throw error;
    }

    // Calculate discount amount
    let discountAmount = 0;
    const promoValue = Number(promo.value);

    if (promo.type === 'PERCENTAGE') {
      discountAmount = (subtotal * promoValue) / 100;
      if (promo.maxDiscount) {
        discountAmount = Math.min(discountAmount, Number(promo.maxDiscount));
      }
    } else {
      // FIXED
      discountAmount = Math.min(promoValue, subtotal);
    }

    discountAmount = Math.round(discountAmount);

    return {
      valid: true,
      promoCode: promo.code,
      name: promo.name,
      type: promo.type,
      value: promoValue,
      discountAmount,
      promotion: promo,
    };
  }
}
