import { z } from 'zod';

export const createUserSchema = z.object({
  name: z.string().trim().min(2, 'Nama minimal 2 karakter'),
  email: z.string().trim().email('Format email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  phone: z.string().trim().optional().nullable(),
  role: z.enum(['OWNER', 'ADMIN', 'CASHIER', 'WAREHOUSE'], {
    errorMap: () => ({ message: 'Role harus OWNER, ADMIN, CASHIER, atau WAREHOUSE' }),
  }),
  isActive: z.boolean().default(true),
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(2, 'Nama minimal 2 karakter').optional(),
  email: z.string().trim().email('Format email tidak valid').optional(),
  phone: z.string().trim().optional().nullable(),
  role: z.enum(['OWNER', 'ADMIN', 'CASHIER', 'WAREHOUSE']).optional(),
  isActive: z.boolean().optional(),
});

export const changePasswordSchema = z.object({
  newPassword: z.string().min(6, 'Password baru minimal 6 karakter'),
});

export const userQuerySchema = z.object({
  search: z.string().optional(),
  role: z.enum(['OWNER', 'ADMIN', 'CASHIER', 'WAREHOUSE']).optional(),
  active: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UserQueryInput = z.infer<typeof userQuerySchema>;
