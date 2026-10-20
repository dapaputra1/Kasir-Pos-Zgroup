import { StockMovement } from './product';

export interface DashboardMetrics {
  totalProducts: number;
  activeProducts: number;
  totalCategories: number;
  lowStockCount: number;
  outOfStockCount: number;
  todaySales?: number;
  todayOrdersCount?: number;
  totalReceivables?: number;
  totalPayables?: number;
}

export interface CriticalStockItem {
  id: number;
  name: string;
  currentStock: number | string;
  minStock: number | string;
  baseUnit: string;
  status: 'out_of_stock' | 'low_stock';
}

export interface DashboardSummary {
  metrics: DashboardMetrics;
  criticalStockItems: CriticalStockItem[];
  recentMovements: StockMovement[];
}
