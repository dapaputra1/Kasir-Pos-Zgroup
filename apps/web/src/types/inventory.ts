import { MovementType } from './product';

export interface InventoryMovementLog {
  id: number;
  productId: number;
  type: MovementType;
  quantity: number | string;
  previousStock: number | string;
  currentStock: number | string;
  referenceType: string | null;
  referenceId: string | null;
  note: string | null;
  createdAt: string;
  product: {
    id: number;
    sku: string;
    name: string;
    baseUnit: string;
    category?: { id: number; name: string } | null;
  };
  user?: {
    id: number;
    name: string;
    role: string;
  } | null;
}
