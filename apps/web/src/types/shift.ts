export interface CashShiftMetrics {
  totalOrdersCount: number;
  totalCashSales: number;
  totalNonCashSales: number;
  totalCashDebtPaid: number;
  totalCashRefunds: number;
  expectedCash: number;
}

export interface CashShift {
  id: number;
  userId: number;
  user: {
    id: number;
    name: string;
    role: string;
  };
  startTime: string;
  endTime?: string | null;
  startingCash: number;
  expectedCash?: number | null;
  closingCash?: number | null;
  difference?: number | null;
  status: 'OPEN' | 'CLOSED';
  notes?: string | null;
  createdAt: string;
  metrics?: CashShiftMetrics;
}

export interface StartShiftInput {
  startingCash: number;
  notes?: string;
}

export interface CloseShiftInput {
  closingCash: number;
  notes?: string;
}
