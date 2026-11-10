import { z } from 'zod';

export const saveBundleComponentsSchema = z.object({
  components: z
    .array(
      z.object({
        componentProductId: z.number().int().positive('ID produk komponen harus berupa bilangan bulat positif'),
        quantity: z.number().positive('Jumlah kuantitas komponen harus lebih besar dari 0'),
      })
    )
    .min(1, 'Paket bundling harus memiliki minimal 1 produk komponen sembako.'),
});

export const saveUnitTiersSchema = z.object({
  tiers: z.array(
    z.object({
      minQuantity: z.number().int().min(2, 'Minimal kuantitas tier grosir harus lebih dari 1 unit.'),
      price: z.number().min(0, 'Harga tier diskon tidak boleh negatif.'),
      label: z.string().max(100, 'Label tier maksimal 100 karakter').optional(),
    })
  ),
});

export type SaveBundleComponentsInput = z.infer<typeof saveBundleComponentsSchema>;
export type SaveUnitTiersInput = z.infer<typeof saveUnitTiersSchema>;
