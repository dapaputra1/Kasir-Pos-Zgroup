import { z } from 'zod';

export const createCategorySchema = z.object({
  code: z.string().min(2, 'Kode kategori minimal 2 karakter').toUpperCase(),
  name: z.string().min(2, 'Nama kategori minimal 2 karakter'),
  description: z.string().optional(),
});

export const updateCategorySchema = createCategorySchema.partial();

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
