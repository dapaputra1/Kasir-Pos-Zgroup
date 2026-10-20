import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import {
  CreateCustomerInput,
  UpdateCustomerInput,
  CustomerQueryInput,
  CustomerPaymentInput,
} from '../validations/customerValidation';

export class CustomerService {
  /**
   * List customers with pagination, search, and active receivables sum
   */
  static async listCustomers(query: CustomerQueryInput) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const { search, tier, active } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.CustomerWhereInput = {};

    if (active !== undefined) {
      where.isActive = active === 'true';
    }

    if (tier) {
      where.tier = tier;
    }

    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { code: { contains: term } },
        { name: { contains: term } },
        { phone: { contains: term } },
        { address: { contains: term } },
      ];
    }

    const [total, customers] = await Promise.all([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: { orders: true },
          },
          orders: {
            where: {
              paymentMethod: 'TEMPO',
              paymentStatus: { in: ['UNPAID', 'PARTIAL'] },
              status: 'COMPLETED',
            },
            select: {
              totalAmount: true,
              amountPaid: true,
            },
          },
        },
      }),
    ]);

    // Format customer debt
    const formatted = customers.map((c) => {
      const totalDebt = c.orders.reduce((acc, curr) => {
        const remaining = Number(curr.totalAmount) - Number(curr.amountPaid);
        return acc + (remaining > 0 ? remaining : 0);
      }, 0);

      const { orders, ...rest } = c;
      return {
        ...rest,
        totalDebt,
        remainingCreditLimit:
          Number(c.creditLimit) > 0 ? Math.max(0, Number(c.creditLimit) - totalDebt) : null,
      };
    });

    return {
      data: formatted,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single customer by ID
   */
  static async getCustomerById(id: number) {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            items: true,
          },
        },
        _count: {
          select: { orders: true },
        },
      },
    });

    if (!customer) {
      const error: any = new Error('Pelanggan tidak ditemukan.');
      error.statusCode = 404;
      throw error;
    }

    // Calculate unpaid tempo debt for this customer
    const unpaidOrders = await prisma.order.findMany({
      where: {
        customerId: id,
        paymentMethod: 'TEMPO',
        paymentStatus: { in: ['UNPAID', 'PARTIAL'] },
        status: 'COMPLETED',
      },
      select: {
        totalAmount: true,
        amountPaid: true,
      },
    });

    const totalDebt = unpaidOrders.reduce((acc, curr) => {
      const remaining = Number(curr.totalAmount) - Number(curr.amountPaid);
      return acc + (remaining > 0 ? remaining : 0);
    }, 0);

    return {
      ...customer,
      totalDebt,
      remainingCreditLimit:
        Number(customer.creditLimit) > 0
          ? Math.max(0, Number(customer.creditLimit) - totalDebt)
          : null,
    };
  }

  /**
   * Auto generate customer code: CUST-001, CUST-002, ...
   */
  private static async generateCustomerCode(): Promise<string> {
    const count = await prisma.customer.count();
    let num = count + 1;
    let code = `CUST-${String(num).padStart(3, '0')}`;

    while (await prisma.customer.findUnique({ where: { code } })) {
      num += 1;
      code = `CUST-${String(num).padStart(3, '0')}`;
    }

    return code;
  }

  /**
   * Create customer
   */
  static async createCustomer(data: CreateCustomerInput) {
    const code = data.code?.trim() || (await this.generateCustomerCode());

    const existing = await prisma.customer.findUnique({ where: { code } });
    if (existing) {
      const error: any = new Error(`Kode pelanggan '${code}' sudah digunakan.`);
      error.statusCode = 400;
      throw error;
    }

    return prisma.customer.create({
      data: {
        code,
        name: data.name.trim(),
        phone: data.phone?.trim() || null,
        address: data.address?.trim() || null,
        tier: data.tier || 'REGULAR',
        creditLimit: new Prisma.Decimal((data.creditLimit || 0).toString()),
        isActive: data.isActive ?? true,
      },
    });
  }

  /**
   * Update customer
   */
  static async updateCustomer(id: number, data: UpdateCustomerInput) {
    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) {
      const error: any = new Error('Pelanggan tidak ditemukan.');
      error.statusCode = 404;
      throw error;
    }

    if (data.code && data.code !== existing.code) {
      const codeTaken = await prisma.customer.findUnique({ where: { code: data.code } });
      if (codeTaken) {
        const error: any = new Error(`Kode pelanggan '${data.code}' sudah digunakan.`);
        error.statusCode = 400;
        throw error;
      }
    }

    return prisma.customer.update({
      where: { id },
      data: {
        code: data.code?.trim(),
        name: data.name?.trim(),
        phone: data.phone !== undefined ? data.phone?.trim() || null : undefined,
        address: data.address !== undefined ? data.address?.trim() || null : undefined,
        tier: data.tier,
        creditLimit:
          data.creditLimit !== undefined
            ? new Prisma.Decimal(data.creditLimit.toString())
            : undefined,
        isActive: data.isActive,
      },
    });
  }

  /**
   * Delete or soft-delete customer
   */
  static async deleteCustomer(id: number) {
    const existing = await prisma.customer.findUnique({
      where: { id },
      include: { _count: { select: { orders: true } } },
    });

    if (!existing) {
      const error: any = new Error('Pelanggan tidak ditemukan.');
      error.statusCode = 404;
      throw error;
    }

    if (existing._count.orders > 0) {
      // Soft-delete to preserve sales history
      return prisma.customer.update({
        where: { id },
        data: { isActive: false },
      });
    }

    return prisma.customer.delete({ where: { id } });
  }

  /**
   * List customer receivables (Piutang Bon Kasir Tempo)
   */
  static async listReceivables(query: {
    customerId?: number;
    search?: string;
    status?: 'UNPAID' | 'PARTIAL' | 'PAID';
    page?: number;
    limit?: number;
  }) {
    const { customerId, search, status } = query;
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {
      paymentMethod: 'TEMPO',
      status: 'COMPLETED',
    };

    if (customerId) {
      where.customerId = customerId;
    }

    if (status) {
      where.paymentStatus = status;
    } else {
      // By default show active receivables
      where.paymentStatus = { in: ['UNPAID', 'PARTIAL'] };
    }

    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { invoiceNumber: { contains: term } },
        { customer: { name: { contains: term } } },
        { customer: { code: { contains: term } } },
      ];
    }

    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: true,
          user: { select: { id: true, name: true, role: true } },
          payments: { orderBy: { paymentDate: 'desc' } },
        },
      }),
    ]);

    return {
      data: orders,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Record payment for customer tempo order
   */
  static async recordOrderPayment(orderId: number, input: CustomerPaymentInput, userId: number) {
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { customer: true },
      });

      if (!order) {
        const error: any = new Error('Faktur pesanan tidak ditemukan.');
        error.statusCode = 404;
        throw error;
      }

      if (order.status === 'CANCELLED') {
        const error: any = new Error('Faktur pesanan ini sudah dibatalkan.');
        error.statusCode = 400;
        throw error;
      }

      const totalAmount = new Prisma.Decimal(order.totalAmount.toString());
      const currentPaid = new Prisma.Decimal(order.amountPaid.toString());
      const remainingDebt = totalAmount.sub(currentPaid);

      if (remainingDebt.lessThanOrEqualTo(0)) {
        const error: any = new Error('Faktur pesanan ini sudah lunas.');
        error.statusCode = 400;
        throw error;
      }

      const paymentDec = new Prisma.Decimal(input.amount.toString());
      if (paymentDec.greaterThan(remainingDebt)) {
        const error: any = new Error(
          `Nominal pembayaran (Rp ${Number(paymentDec).toLocaleString(
            'id-ID'
          )}) melebihi sisa piutang (Rp ${Number(remainingDebt).toLocaleString('id-ID')}).`
        );
        error.statusCode = 400;
        throw error;
      }

      const newPaid = currentPaid.add(paymentDec);
      const newStatus = newPaid.greaterThanOrEqualTo(totalAmount) ? 'PAID' : 'PARTIAL';

      // 1. Create OrderPayment Log
      const paymentLog = await tx.orderPayment.create({
        data: {
          orderId: order.id,
          userId,
          amount: paymentDec,
          paymentDate: new Date(),
          paymentMethod: input.paymentMethod,
          note:
            input.note?.trim() ||
            `Pelunasan piutang bon toko (${newStatus === 'PAID' ? 'LUNAS' : 'CICILAN'})`,
        },
      });

      // 2. Update Order
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          amountPaid: newPaid,
          paymentStatus: newStatus,
        },
        include: {
          customer: true,
          payments: { orderBy: { paymentDate: 'desc' } },
        },
      });

      return {
        order: updatedOrder,
        payment: paymentLog,
      };
    });
  }

  /**
   * Summary of customer receivables (Total piutang toko)
   */
  static async getReceivablesSummary() {
    const [allTempoOrders, totalCustomers] = await Promise.all([
      prisma.order.findMany({
        where: {
          paymentMethod: 'TEMPO',
          paymentStatus: { in: ['UNPAID', 'PARTIAL'] },
          status: 'COMPLETED',
        },
        select: {
          totalAmount: true,
          amountPaid: true,
          dueDate: true,
        },
      }),
      prisma.customer.count({ where: { isActive: true } }),
    ]);

    let totalReceivables = 0;
    let dueSoonCount = 0;
    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

    for (const o of allTempoOrders) {
      const remaining = Number(o.totalAmount) - Number(o.amountPaid);
      if (remaining > 0) {
        totalReceivables += remaining;
      }
      if (o.dueDate && new Date(o.dueDate) <= sevenDaysLater) {
        dueSoonCount++;
      }
    }

    return {
      totalReceivables,
      unpaidOrdersCount: allTempoOrders.length,
      dueSoonCount,
      activeCustomersCount: totalCustomers,
    };
  }
}
