import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
});

export const createUserSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  phone: z.string().optional(),
  role: z.enum(['OWNER', 'ADMIN', 'CASHIER', 'WAREHOUSE'], {
    errorMap: () => ({ message: 'Role harus salah satu dari: OWNER, ADMIN, CASHIER, WAREHOUSE' }),
  }),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
