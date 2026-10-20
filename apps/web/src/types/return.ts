export interface SaleReturnItem {
  id: number;
  saleReturnId: number;
  productId: number;
  product: {
    id: number;
    name: string;
    sku: string;
  };
  unitName: string;
  conversionFactor: number;
  quantity: number;
  baseQuantity: number;
  price: number;
  subtotal: number;
  returnToStock: boolean;
}

export interface SaleReturn {
  id: number;
  returnNumber: string;
  orderId: number;
  order: {
    id: number;
    invoiceNumber: string;
    customer?: {
      id: number;
      name: string;
    } | null;
  };
  userId: number;
  user: {
    id: number;
    name: string;
  };
  reason: string;
  refundMethod: 'CASH' | 'CREDIT_OFFSET' | 'NO_REFUND';
  totalAmount: number;
  createdAt: string;
  items: SaleReturnItem[];
}

export interface PurchaseReturnItem {
  id: number;
  purchaseReturnId: number;
  productId: number;
  product: {
    id: number;
    name: string;
    sku: string;
  };
  unitName: string;
  conversionFactor: number;
  quantity: number;
  baseQuantity: number;
  cost: number;
  subtotal: number;
}

export interface PurchaseReturn {
  id: number;
  returnNumber: string;
  purchaseId: number;
  purchase: {
    id: number;
    purchaseNumber: string;
  };
  supplierId: number;
  supplier: {
    id: number;
    name: string;
  };
  userId: number;
  user: {
    id: number;
    name: string;
  };
  reason: string;
  refundMethod: 'CASH' | 'DEBT_OFFSET';
  totalAmount: number;
  createdAt: string;
  items: PurchaseReturnItem[];
}
