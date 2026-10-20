import { Category } from './category';
import { PriceTier } from './promotion';

export interface ProductUnit {
  id?: number;
  productId?: number;
  unitName: string;
  conversionFactor: number;
  isBaseUnit: boolean;
  price: number;
  wholesalePrice?: number | null;
  barcode?: string | null;
  priceTiers?: PriceTier[];
}

export type MovementType = 'IN' | 'OUT' | 'ADJUSTMENT' | 'RETURN';

export interface StockMovement {
  id: number;
  productId: number;
  type: MovementType;
  quantity: number | string;
  previousStock: number | string;
  currentStock: number | string;
  referenceType?: string | null;
  referenceId?: string | null;
  note?: string | null;
  createdAt: string;
  product?: {
    id: number;
    name: string;
    sku: string;
    baseUnit: string;
  } | null;
  user?: {
    id: number;
    name: string;
    role: string;
  } | null;
}

export interface Product {
  id: number;
  sku: string;
  barcode?: string | null;
  name: string;
  description?: string | null;
  categoryId: number;
  category?: Category;
  baseUnit: string;
  currentStock: number | string;
  minStock: number | string;
  purchasePrice: number | string;
  isBundle?: boolean;
  bundleParents?: any[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  units: ProductUnit[];
  stockMovements?: StockMovement[];
}

export interface ProductPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
