import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { CreateSupplierInput, UpdateSupplierInput, SupplierQueryInput } from '../validations/supplierValidation';

export class SupplierService {
  /**
   * List suppliers with search, filter, and pagination
   */
  static async listSuppliers(query: SupplierQueryInput) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const { search, active } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.SupplierWhereInput = {};

    if (active !== undefined) {
      where.isActive = active === 'true';
    }

    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { code: { contains: term } },
        { name: { contains: term } },
        { contactPerson: { contains: term } },
        { phone: { contains: term } },
        { address: { contains: term } },
      ];
    }

    const [total, suppliers] = await Promise.all([
      prisma.supplier.count({ where }),
      prisma.supplier.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: { purchases: true },
          },
        },
      }),
    ]);

    return {
      data: suppliers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single supplier with purchase history & debt summary
   */
  static async getSupplierById(id: number) {
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        purchases: {
          orderBy: { purchaseDate: 'desc' },
          take: 10,
        },
        _count: {
          select: { purchases: true },
        },
      },
    });

    if (!supplier) {
      const error: any = new Error('Supplier tidak ditemukan.');
      error.statusCode = 404;
      throw error;
    }

    // Calculate unpaid tempo debt for this supplier
    const unpaidPurchases = await prisma.purchase.findMany({
      where: {
        supplierId: id,
        paymentType: 'TEMPO',
        paymentStatus: { in: ['UNPAID', 'PARTIAL'] },
        status: 'RECEIVED',
      },
      select: {
        totalAmount: true,
        amountPaid: true,
      },
    });

    const totalDebt = unpaidPurchases.reduce((acc, curr) => {
      const remaining = Number(curr.totalAmount) - Number(curr.amountPaid);
      return acc + (remaining > 0 ? remaining : 0);
    }, 0);

    return {
      ...supplier,
      totalDebt,
    };
  }

  /**
   * Generate next unique supplier code: SUPP-001, SUPP-002, etc.
   */
  private static async generateSupplierCode(): Promise<string> {
    const count = await prisma.supplier.count();
    let num = count + 1;
    let code = `SUPP-${String(num).padStart(3, '0')}`;

    while (await prisma.supplier.findUnique({ where: { code } })) {
      num += 1;
      code = `SUPP-${String(num).padStart(3, '0')}`;
    }

    return code;
  }

  /**
   * Create new supplier
   */
  static async createSupplier(data: CreateSupplierInput) {
    const code = data.code?.trim() || (await this.generateSupplierCode());

    // Check code collision
    const existing = await prisma.supplier.findUnique({ where: { code } });
    if (existing) {
      const error: any = new Error(`Kode supplier '${code}' sudah digunakan.`);
      error.statusCode = 400;
      throw error;
    }

    return prisma.supplier.create({
      data: {
        code,
        name: data.name.trim(),
        contactPerson: data.contactPerson?.trim() || null,
        phone: data.phone?.trim() || null,
        address: data.address?.trim() || null,
        isActive: data.isActive ?? true,
      },
    });
  }

  /**
   * Update existing supplier
   */
  static async updateSupplier(id: number, data: UpdateSupplierInput) {
    const existing = await prisma.supplier.findUnique({ where: { id } });
    if (!existing) {
      const error: any = new Error('Supplier tidak ditemukan.');
      error.statusCode = 404;
      throw error;
    }

    if (data.code && data.code !== existing.code) {
      const codeTaken = await prisma.supplier.findUnique({ where: { code: data.code } });
      if (codeTaken) {
        const error: any = new Error(`Kode supplier '${data.code}' sudah digunakan.`);
        error.statusCode = 400;
        throw error;
      }
    }

    return prisma.supplier.update({
      where: { id },
      data: {
        code: data.code?.trim(),
        name: data.name?.trim(),
        contactPerson: data.contactPerson !== undefined ? data.contactPerson?.trim() || null : undefined,
        phone: data.phone !== undefined ? data.phone?.trim() || null : undefined,
        address: data.address !== undefined ? data.address?.trim() || null : undefined,
        isActive: data.isActive,
      },
    });
  }

  /**
   * Delete or soft-delete supplier
   */
  static async deleteSupplier(id: number) {
    const existing = await prisma.supplier.findUnique({
      where: { id },
      include: {
        _count: { select: { purchases: true } },
      },
    });

    if (!existing) {
      const error: any = new Error('Supplier tidak ditemukan.');
      error.statusCode = 404;
      throw error;
    }

    if (existing._count.purchases > 0) {
      // Soft-delete to preserve purchase history audit trail
      return prisma.supplier.update({
        where: { id },
        data: { isActive: false },
      });
    }

    return prisma.supplier.delete({
      where: { id },
    });
  }
}
