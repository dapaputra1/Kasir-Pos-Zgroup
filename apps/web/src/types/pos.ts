import { ProductUnit } from './product';

export type PaymentMethod = 'CASH' | 'TRANSFER' | 'QRIS' | 'TEMPO';

export interface CartItem {
  productId: number;
  productName: string;
  sku: string;
  barcode?: string | null;
  baseUnit: string;
  currentStock: number;
  selectedUnit: ProductUnit;
  availableUnits: ProductUnit[];
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Customer {
  id: number;
  code: string;
  name: string;
  phone?: string | null;
  address?: string | null;
  tier: 'REGULAR' | 'GROSIR' | 'VIP';
}

export interface OrderItem {
  id: number;
  productId: number;
  productName: string;
  sku: string;
  unitName: string;
  conversionFactor: number | string;
  quantity: number | string;
  baseQuantity: number | string;
  unitPrice: number | string;
  subtotal: number | string;
  totalAmount: number | string;
}

export interface Order {
  id: number;
  invoiceNumber: string;
  userId: number;
  customerId?: number | null;
  subtotal: number | string;
  discountAmount: number | string;
  taxAmount: number | string;
  totalAmount: number | string;
  paymentMethod: PaymentMethod;
  amountPaid: number | string;
  changeAmount: number | string;
  status: 'COMPLETED' | 'PENDING' | 'CANCELLED';
  notes?: string | null;
  createdAt: string;
  items?: OrderItem[];
  user?: {
    id: number;
    name: string;
    role: string;
  };
  customer?: Customer | null;
}
