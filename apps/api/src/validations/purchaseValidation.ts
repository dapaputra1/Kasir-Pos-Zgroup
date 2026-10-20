import { z } from 'zod';

export const purchaseItemInputSchema = z.object({
  productId: z.coerce.number().int().positive('ID Produk tidak valid'),
  productUnitId: z.coerce.number().int().positive().optional().nullable(),
  quantity: z.coerce.number().positive('Jumlah barang masuk harus lebih dari 0'),
  unitCost: z.coerce.number().min(0, 'Harga beli tidak boleh negatif'),
  updateProductCost: z.boolean().default(true),
});

export const createPurchaseSchema = z.object({
  supplierId: z.coerce.number().int().positive('Pilih supplier terlebih dahulu'),
  supplierInvoiceNo: z.string().trim().optional().nullable(),
  purchaseDate: z.string().optional(),
  paymentType: z.enum(['CASH', 'TEMPO'], {
    errorMap: () => ({ message: 'Tipe pembayaran harus CASH atau TEMPO' }),
  }),
  dueDate: z.string().optional().nullable(),
  amountPaid: z.coerce.number().min(0, 'Nominal pembayaran tidak boleh negatif').optional(),
  discountAmount: z.coerce.number().min(0, 'Diskon tidak boleh negatif').default(0),
  taxAmount: z.coerce.number().min(0, 'Pajak tidak boleh negatif').default(0),
  notes: z.string().optional().nullable(),
  items: z.array(purchaseItemInputSchema).min(1, 'Daftar barang kulakan tidak boleh kosong'),
});

export const purchasePaymentSchema = z.object({
  amount: z.coerce.number().positive('Nominal pembayaran hutang harus lebih dari 0'),
  paymentMethod: z.enum(['CASH', 'TRANSFER', 'QRIS', 'TEMPO']).default('CASH'),
  note: z.string().optional().nullable(),
});

export const purchaseQuerySchema = z.object({
  search: z.string().optional(),
  supplierId: z.coerce.number().int().positive().optional(),
  paymentType: z.enum(['CASH', 'TEMPO']).optional(),
  paymentStatus: z.enum(['PAID', 'UNPAID', 'PARTIAL']).optional(),
  status: z.enum(['RECEIVED', 'CANCELLED']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type PurchaseItemInput = z.infer<typeof purchaseItemInputSchema>;
export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>;
export type PurchasePaymentInput = z.infer<typeof purchasePaymentSchema>;
export type PurchaseQueryInput = z.infer<typeof purchaseQuerySchema>;
