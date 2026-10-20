export interface Supplier {
  id: number;
  code: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  address: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    purchases: number;
  };
  totalDebt?: number;
}

export type PurchasePaymentType = 'CASH' | 'TEMPO';
export type PurchasePaymentStatus = 'PAID' | 'UNPAID' | 'PARTIAL';
export type PurchaseStatus = 'RECEIVED' | 'CANCELLED';

export interface PurchaseItem {
  id: number;
  purchaseId: number;
  productId: number;
  productUnitId: number | null;
  productName: string;
  sku: string;
  unitName: string;
  conversionFactor: number | string;
  quantity: number | string;
  baseQuantity: number | string;
  unitCost: number | string;
  baseCost: number | string;
  subtotal: number | string;
  createdAt: string;
  product?: {
    id: number;
    sku: string;
    name: string;
    baseUnit: string;
    currentStock?: number | string;
  } | null;
}

export interface PurchasePayment {
  id: number;
  purchaseId: number;
  userId: number;
  amount: number | string;
  paymentDate: string;
  paymentMethod: string;
  note: string | null;
  createdAt: string;
}

export interface Purchase {
  id: number;
  purchaseNumber: string;
  supplierInvoiceNo: string | null;
  supplierId: number;
  supplier?: {
    id: number;
    code: string;
    name: string;
    phone: string | null;
    contactPerson?: string | null;
    address?: string | null;
  };
  userId: number;
  user?: {
    id: number;
    name: string;
    role: string;
  };
  purchaseDate: string;
  paymentType: PurchasePaymentType;
  paymentStatus: PurchasePaymentStatus;
  dueDate: string | null;
  subtotal: number | string;
  taxAmount: number | string;
  discountAmount: number | string;
  totalAmount: number | string;
  amountPaid: number | string;
  status: PurchaseStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  items?: PurchaseItem[];
  payments?: PurchasePayment[];
  _count?: {
    items: number;
    payments: number;
  };
}

export interface PurchaseSummary {
  monthlyTotalAmount: number;
  monthlyPurchaseCount: number;
  totalUnpaidDebt: number;
  tempoPurchasesCount: number;
  dueSoonCount: number;
  activeSuppliersCount: number;
}
