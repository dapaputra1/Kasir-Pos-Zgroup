import { z } from 'zod';

export const updateStoreSettingSchema = z.object({
  storeName: z.string().trim().min(2, 'Nama toko minimal 2 karakter'),
  tagline: z.string().trim().optional(),
  address: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  footerReceipt: z.string().trim().optional(),
  paperSize: z.enum(['58mm', '80mm']).default('58mm'),
});
