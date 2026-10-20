import { z } from 'zod';

export const productUnitSchema = z.object({
  id: z.number().optional(),
  unitName: z.string().min(1, 'Nama satuan wajib diisi').toUpperCase(),
  conversionFactor: z.coerce.number().positive('Faktor konversi harus lebih dari 0'),
  isBaseUnit: z.boolean().default(false),
  price: z.coerce.number().min(0, 'Harga jual minimal 0'),
  wholesalePrice: z.coerce.number().min(0, 'Harga grosir minimal 0').optional().nullable(),
  barcode: z.string().optional().nullable(),
});

export const createProductSchema = z.object({
  sku: z.string().min(2, 'SKU minimal 2 karakter').toUpperCase(),
  barcode: z.string().optional().nullable(),
  name: z.string().min(2, 'Nama produk minimal 2 karakter'),
  categoryId: z.coerce.number({ invalid_type_error: 'Kategori wajib dipilih' }).int().positive(),
  description: z.string().optional().nullable(),
  baseUnit: z.string().min(1, 'Satuan dasar wajib diisi').toUpperCase(),
  minStock: z.coerce.number().min(0, 'Batas minimum stok tidak boleh negatif').default(10),
  purchasePrice: z.coerce.number().min(0, 'Harga beli (HPP) tidak boleh negatif').default(0),
  initialStock: z.coerce.number().min(0, 'Stok awal tidak boleh negatif').default(0),
  units: z
    .array(productUnitSchema)
    .min(1, 'Minimal harus memiliki 1 satuan (satuan dasar)'),
});

export const updateProductSchema = z.object({
  sku: z.string().min(2, 'SKU minimal 2 karakter').toUpperCase().optional(),
  barcode: z.string().optional().nullable(),
  name: z.string().min(2, 'Nama produk minimal 2 karakter').optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  description: z.string().optional().nullable(),
  baseUnit: z.string().min(1).toUpperCase().optional(),
  minStock: z.coerce.number().min(0).optional(),
  purchasePrice: z.coerce.number().min(0).optional(),
  isActive: z.boolean().optional(),
  units: z.array(productUnitSchema).min(1).optional(),
});

export const adjustStockSchema = z.object({
  type: z.enum(['IN', 'OUT', 'ADJUSTMENT', 'RETURN'], {
    errorMap: () => ({ message: 'Tipe penyesuaian harus IN, OUT, ADJUSTMENT, atau RETURN' }),
  }),
  quantity: z.coerce.number().positive('Jumlah penyesuaian harus lebih dari 0'),
  note: z.string().min(3, 'Keterangan alasan penyesuaian stok wajib diisi minimal 3 karakter'),
  referenceType: z.string().optional().default('MANUAL_ADJUSTMENT'),
});

export const productQuerySchema = z.object({
  search: z.string().optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  stockStatus: z.enum(['all', 'in_stock', 'low_stock', 'out_of_stock']).optional().default('all'),
  isActive: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type AdjustStockInput = z.infer<typeof adjustStockSchema>;
export type ProductQueryInput = z.infer<typeof productQuerySchema>;
