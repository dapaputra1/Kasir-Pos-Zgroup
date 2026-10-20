import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma';
import { CreateUserInput, UpdateUserInput, UserQueryInput } from '../validations/userValidation';

export class UserService {
  static async listUsers(query: UserQueryInput) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const { search, role, active } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};

    if (active !== undefined) {
      where.isActive = String(active) === 'true';
    }

    if (role) {
      where.role = role;
    }

    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { name: { contains: term } },
        { email: { contains: term } },
        { phone: { contains: term } },
      ];
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              orders: true,
              purchases: true,
            },
          },
        },
      }),
    ]);

    return {
      data: users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getUserById(id: number) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            orders: true,
            purchases: true,
          },
        },
      },
    });

    if (!user) {
      const error: any = new Error('Pengguna tidak ditemukan.');
      error.statusCode = 404;
      throw error;
    }

    return user;
  }

  static async createUser(data: CreateUserInput) {
    const emailLower = data.email.toLowerCase().trim();

    const existing = await prisma.user.findUnique({
      where: { email: emailLower },
    });

    if (existing) {
      const error: any = new Error(`Email '${emailLower}' sudah terdaftar.`);
      error.statusCode = 400;
      throw error;
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    return prisma.user.create({
      data: {
        name: data.name.trim(),
        email: emailLower,
        password: passwordHash,
        phone: data.phone?.trim() || null,
        role: data.role,
        isActive: data.isActive ?? true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  static async updateUser(id: number, data: UpdateUserInput) {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      const error: any = new Error('Pengguna tidak ditemukan.');
      error.statusCode = 404;
      throw error;
    }

    if (data.email) {
      const emailLower = data.email.toLowerCase().trim();
      if (emailLower !== existing.email) {
        const emailTaken = await prisma.user.findUnique({ where: { email: emailLower } });
        if (emailTaken) {
          const error: any = new Error(`Email '${emailLower}' sudah digunakan oleh pengguna lain.`);
          error.statusCode = 400;
          throw error;
        }
      }
    }

    // Protect last active OWNER from role demotion or deactivation
    if (existing.role === 'OWNER' && (data.role && data.role !== 'OWNER' || data.isActive === false)) {
      const activeOwnerCount = await prisma.user.count({
        where: { role: 'OWNER', isActive: true },
      });
      if (activeOwnerCount <= 1) {
        const error: any = new Error('Tidak dapat menonaktifkan atau mengubah role satu-satunya Owner sistem.');
        error.statusCode = 400;
        throw error;
      }
    }

    return prisma.user.update({
      where: { id },
      data: {
        name: data.name?.trim(),
        email: data.email?.toLowerCase().trim(),
        phone: data.phone !== undefined ? data.phone?.trim() || null : undefined,
        role: data.role,
        isActive: data.isActive,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });
  }

  static async changePassword(id: number, newPassword: string) {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      const error: any = new Error('Pengguna tidak ditemukan.');
      error.statusCode = 404;
      throw error;
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id },
      data: { password: passwordHash },
    });

    return { message: 'Password berhasil diubah.' };
  }
}
