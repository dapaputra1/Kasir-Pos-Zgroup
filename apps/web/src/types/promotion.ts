export interface Promotion {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  type: 'PERCENTAGE' | 'FIXED';
  value: number;
  minPurchase: number;
  maxDiscount?: number | null;
  quota?: number | null;
  usedCount: number;
  startDate?: string | null;
  endDate?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PriceTier {
  id: number;
  productUnitId: number;
  minQuantity: number;
  price: number;
  label?: string | null;
}

export interface BundleItem {
  id: number;
  bundleProductId: number;
  componentProductId: number;
  quantity: number;
  componentProduct?: {
    id: number;
    name: string;
    sku: string;
    baseUnit: string;
    currentStock: number;
    purchasePrice: number;
  };
}

export interface BundleProduct {
  id: number;
  sku: string;
  name: string;
  description?: string | null;
  baseUnit: string;
  currentStock: number;
  purchasePrice: number;
  isBundle: boolean;
  calculatedAvailableStock: number;
  totalComponentHpp: number;
  bundleParents: BundleItem[];
  units: {
    id: number;
    unitName: string;
    price: number;
    wholesalePrice?: number | null;
    conversionFactor?: number;
    priceTiers?: PriceTier[];
  }[];
}
