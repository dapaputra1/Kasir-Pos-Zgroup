import { z } from 'zod';

export const createCustomerSchema = z.object({
  code: z.string().trim().min(2, 'Kode pelanggan minimal 2 karakter').optional(),
  name: z.string().trim().min(2, 'Nama pelanggan / toko minimal 2 karakter'),
  phone: z.string().trim().optional().nullable(),
  address: z.string().trim().optional().nullable(),
  tier: z.enum(['REGULAR', 'GROSIR', 'VIP']).default('REGULAR'),
  creditLimit: z.coerce.number().min(0, 'Plafon kredit tidak boleh negatif').default(0),
  isActive: z.boolean().default(true),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export const customerQuerySchema = z.object({
  search: z.string().optional(),
  tier: z.enum(['REGULAR', 'GROSIR', 'VIP']).optional(),
  active: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const customerPaymentSchema = z.object({
  amount: z.coerce.number().positive('Nominal pembayaran bon harus lebih dari 0'),
  paymentMethod: z.enum(['CASH', 'TRANSFER', 'QRIS', 'TEMPO']).default('CASH'),
  note: z.string().optional().nullable(),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type CustomerQueryInput = z.infer<typeof customerQuerySchema>;
export type CustomerPaymentInput = z.infer<typeof customerPaymentSchema>;
