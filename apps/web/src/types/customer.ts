export interface Customer {
  id: number;
  code: string;
  name: string;
  phone: string | null;
  address: string | null;
  tier: 'REGULAR' | 'GROSIR' | 'VIP';
  creditLimit: number | string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  totalDebt?: number;
  remainingCreditLimit?: number | null;
  _count?: {
    orders: number;
  };
}

export interface CustomerReceivableOrder {
  id: number;
  invoiceNumber: string;
  userId: number;
  user?: {
    id: number;
    name: string;
    role: string;
  };
  customerId: number | null;
  customer?: Customer | null;
  totalAmount: number | string;
  amountPaid: number | string;
  paymentMethod: string;
  paymentStatus: 'PAID' | 'UNPAID' | 'PARTIAL';
  dueDate: string | null;
  createdAt: string;
  payments?: {
    id: number;
    amount: number | string;
    paymentDate: string;
    paymentMethod: string;
    note: string | null;
  }[];
}

export interface ReceivablesSummary {
  totalReceivables: number;
  unpaidOrdersCount: number;
  dueSoonCount: number;
  activeCustomersCount: number;
}
