import { prisma } from '../config/prisma';

export class DashboardService {
  static async getSummary() {
    const [
      totalProducts,
      activeProducts,
      totalCategories,
      recentMovements,
      allProducts,
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

    return {
      metrics: {
        totalProducts,
        activeProducts,
        totalCategories,
        lowStockCount,
        outOfStockCount,
      },
      criticalStockItems: criticalStockItems.slice(0, 5),
      recentMovements,
    };
  }
}
