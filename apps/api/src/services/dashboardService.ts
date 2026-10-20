import { prisma } from '../config/prisma';

export class DashboardService {
  static async getSummary() {
    // Start of today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      totalProducts,
      activeProducts,
      totalCategories,
      recentMovements,
      allProducts,
      todayOrders,
      tempoOrders,
      tempoPurchases,
    ] = await Promise.all([
      prisma.product.count(),
      prisma.product.count({ where: { isActive: true } }),
      prisma.category.count({ where: { isActive: true } }),
      prisma.stockMovement.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: {
          product: {
            select: { id: true, name: true, sku: true, baseUnit: true },
          },
          user: {
            select: { id: true, name: true, role: true },
          },
        },
      }),
      prisma.product.findMany({
        where: { isActive: true },
        select: { id: true, name: true, currentStock: true, minStock: true, baseUnit: true },
      }),
      prisma.order.aggregate({
        where: {
          status: 'COMPLETED',
          createdAt: { gte: startOfToday },
        },
        _sum: { totalAmount: true },
        _count: { id: true },
      }),
      prisma.order.findMany({
        where: {
          paymentMethod: 'TEMPO',
          paymentStatus: { in: ['UNPAID', 'PARTIAL'] },
          status: 'COMPLETED',
        },
        select: { totalAmount: true, amountPaid: true },
      }),
      prisma.purchase.findMany({
        where: {
          paymentType: 'TEMPO',
          paymentStatus: { in: ['UNPAID', 'PARTIAL'] },
          status: 'RECEIVED',
        },
        select: { totalAmount: true, amountPaid: true },
      }),
    ]);

    // Count low stock items (stock > 0 and <= minStock) and out of stock items
    let lowStockCount = 0;
    let outOfStockCount = 0;
    const criticalStockItems: any[] = [];

    allProducts.forEach((p) => {
      const stock = Number(p.currentStock);
      const min = Number(p.minStock);
      if (stock <= 0) {
        outOfStockCount++;
        criticalStockItems.push({ ...p, status: 'out_of_stock' });
      } else if (stock <= min) {
        lowStockCount++;
        criticalStockItems.push({ ...p, status: 'low_stock' });
      }
    });

    const totalReceivables = tempoOrders.reduce((acc, curr) => {
      const rem = Number(curr.totalAmount) - Number(curr.amountPaid);
      return acc + (rem > 0 ? rem : 0);
    }, 0);

    const totalPayables = tempoPurchases.reduce((acc, curr) => {
      const rem = Number(curr.totalAmount) - Number(curr.amountPaid);
      return acc + (rem > 0 ? rem : 0);
    }, 0);

    return {
      metrics: {
        totalProducts,
        activeProducts,
        totalCategories,
        lowStockCount,
        outOfStockCount,
        todaySales: Number(todayOrders._sum.totalAmount || 0),
        todayOrdersCount: todayOrders._count.id || 0,
        totalReceivables,
        totalPayables,
      },
      criticalStockItems: criticalStockItems.slice(0, 5),
      recentMovements,
    };
  }
}
