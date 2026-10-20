import { z } from 'zod';

export const startShiftSchema = z.object({
  startingCash: z
    .number({ invalid_type_error: 'Modal awal kasir harus berupa angka' })
    .min(0, 'Modal awal kasir tidak boleh negatif'),
  notes: z.string().trim().optional(),
});

export const closeShiftSchema = z.object({
  closingCash: z
    .number({ invalid_type_error: 'Uang fisik kasir harus berupa angka' })
    .min(0, 'Uang fisik kasir tidak boleh negatif'),
  notes: z.string().trim().optional(),
});
