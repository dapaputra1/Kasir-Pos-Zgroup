import { z } from 'zod';

export const orderItemInputSchema = z.object({
  productId: z.coerce.number().int().positive('ID Produk tidak valid'),
  productUnitId: z.coerce.number().int().positive().optional().nullable(),
  quantity: z.coerce.number().positive('Jumlah barang harus lebih dari 0'),
  customPrice: z.coerce.number().min(0, 'Harga tidak boleh negatif').optional(),
});

export const checkoutSchema = z.object({
  customerId: z.coerce.number().int().positive().optional().nullable(),
  paymentMethod: z.enum(['CASH', 'TRANSFER', 'QRIS', 'TEMPO'], {
    errorMap: () => ({ message: 'Metode pembayaran harus CASH, TRANSFER, QRIS, atau TEMPO' }),
  }),
  amountPaid: z.coerce.number().min(0, 'Nominal pembayaran tidak boleh negatif'),
  discountAmount: z.coerce.number().min(0, 'Diskon tidak boleh negatif').default(0),
  taxAmount: z.coerce.number().min(0, 'Pajak tidak boleh negatif').default(0),
  promoCode: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(orderItemInputSchema).min(1, 'Keranjang belanja tidak boleh kosong'),
});

export const orderQuerySchema = z.object({
  search: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  paymentMethod: z.enum(['CASH', 'TRANSFER', 'QRIS', 'TEMPO']).optional(),
  status: z.enum(['COMPLETED', 'PENDING', 'CANCELLED']).optional(),
  userId: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type OrderItemInput = z.infer<typeof orderItemInputSchema>;
export type OrderQueryInput = z.infer<typeof orderQuerySchema>;
