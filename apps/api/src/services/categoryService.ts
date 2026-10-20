import { prisma } from '../config/prisma';
import { CreateCategoryInput, UpdateCategoryInput } from '../validations/categoryValidation';

export class CategoryService {
  static async listCategories(onlyActive = false) {
    return prisma.category.findMany({
      where: onlyActive ? { isActive: true } : undefined,
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  static async getCategoryById(id: number) {
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    if (!category) {
      const error: any = new Error('Kategori tidak ditemukan.');
      error.statusCode = 404;
      error.code = 'CATEGORY_NOT_FOUND';
      throw error;
    }

    return category;
  }

  static async createCategory(input: CreateCategoryInput) {
    const existing = await prisma.category.findUnique({
      where: { code: input.code },
    });

    if (existing) {
      const error: any = new Error(`Kode kategori '${input.code}' sudah digunakan.`);
      error.statusCode = 409;
      error.code = 'DUPLICATE_CODE';
      throw error;
    }

    return prisma.category.create({
      data: {
        code: input.code,
        name: input.name,
        description: input.description,
      },
    });
  }

  static async updateCategory(id: number, input: UpdateCategoryInput) {
    await this.getCategoryById(id);

    if (input.code) {
      const existing = await prisma.category.findFirst({
        where: { code: input.code, id: { not: id } },
      });
      if (existing) {
        const error: any = new Error(`Kode kategori '${input.code}' sudah digunakan.`);
        error.statusCode = 409;
        error.code = 'DUPLICATE_CODE';
        throw error;
      }
    }

    return prisma.category.update({
      where: { id },
      data: input,
    });
  }

  static async deleteCategory(id: number) {
    const category = await this.getCategoryById(id);

    if (category._count.products > 0) {
      const error: any = new Error(
        `Kategori tidak dapat dihapus karena masih memiliki ${category._count.products} produk.`
      );
      error.statusCode = 400;
      error.code = 'CATEGORY_HAS_PRODUCTS';
      throw error;
    }

    return prisma.category.delete({
      where: { id },
    });
  }
}
