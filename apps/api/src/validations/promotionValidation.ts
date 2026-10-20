import { z } from 'zod';

export const createPromotionSchema = z.object({
  code: z
    .string()
    .min(3, 'Kode promo minimal 3 karakter')
    .max(50, 'Kode promo maksimal 50 karakter')
    .transform((val) => val.trim().toUpperCase()),
  name: z.string().min(2, 'Nama promo minimal 2 karakter').trim(),
  description: z.string().optional().nullable(),
  type: z.enum(['PERCENTAGE', 'FIXED'], {
    errorMap: () => ({ message: 'Tipe diskon harus PERCENTAGE atau FIXED' }),
  }),
  value: z.coerce.number().positive('Nilai promo harus lebih dari 0'),
  minPurchase: z.coerce.number().min(0, 'Minimal belanja tidak boleh negatif').default(0),
  maxDiscount: z.coerce.number().positive('Maksimal diskon harus lebih dari 0').optional().nullable(),
  quota: z.coerce.number().int().positive('Kuota harus bilangan positif').optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

export const updatePromotionSchema = createPromotionSchema.partial();

export const validateCouponSchema = z.object({
  code: z.string().min(1, 'Kode promo tidak boleh kosong').transform((val) => val.trim().toUpperCase()),
  subtotal: z.coerce.number().min(0, 'Subtotal tidak boleh negatif'),
});

export type CreatePromotionInput = z.infer<typeof createPromotionSchema>;
export type UpdatePromotionInput = z.infer<typeof updatePromotionSchema>;
export type ValidateCouponInput = z.infer<typeof validateCouponSchema>;
