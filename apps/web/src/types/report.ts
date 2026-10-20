export interface ProfitLossData {
  totalOrders: number;
  totalRevenue: number;
  totalDiscount: number;
  totalTax: number;
  totalCogs: number;
  grossProfit: number;
  grossMargin: number;
  totalPurchases: number;
  totalPurchaseCount: number;
}

export interface TopProduct {
  productId: number;
  productName: string;
  sku: string;
  totalQty: number;
  totalRevenue: number;
  totalCogs: number;
  profit: number;
  margin: number;
}

export interface CashflowData {
  cashIn: {
    salesPaid: number;
    receivablesPaid: number;
    total: number;
  };
  cashOut: {
    purchasesPaid: number;
    payablesPaid: number;
    total: number;
  };
  netCashflow: number;
}
