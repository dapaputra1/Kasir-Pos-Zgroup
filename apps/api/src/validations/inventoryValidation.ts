import { z } from 'zod';

export const stockOpnameSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.number().int().positive('ID produk harus berupa bilangan bulat positif'),
        physicalStock: z.number().min(0, 'Stok fisik tidak boleh bernilai negatif'),
        note: z.string().max(255, 'Catatan penyesuaian maksimal 255 karakter').optional(),
      })
    )
    .min(1, 'Minimal satu item produk harus diperiksa dalam proses stock opname'),
});

export type StockOpnameInput = z.infer<typeof stockOpnameSchema>;
