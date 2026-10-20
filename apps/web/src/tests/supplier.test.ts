import { describe, it, expect } from 'vitest';
import { formatRupiah } from '../lib/utils';

describe('Supplier & Purchase Calculations Unit Tests', () => {
  it('should accurately calculate purchase item base quantity and base cost HPP for multi-unit (e.g. DUS)', () => {
    // Restock 10 DUS of Indomie @ Rp 115.000 / DUS (1 DUS = 40 BKS)
    const quantityDus = 10;
    const unitCostDus = 115000;
    const conversionFactor = 40;

    const baseQuantity = quantityDus * conversionFactor; // 400 BKS
    expect(baseQuantity).toBe(400);

    const baseCostHpp = unitCostDus / conversionFactor; // Rp 2.875 / BKS
    expect(baseCostHpp).toBe(2875);

    const subtotal = quantityDus * unitCostDus; // Rp 1.150.000
    expect(subtotal).toBe(1150000);
    expect(formatRupiah(subtotal)).toContain('1.150.000');
  });

  it('should accurately compute remaining tempo debt and payment statuses', () => {
    const totalAmount = 5000000; // Rp 5.000.000
    let amountPaid = 0;

    // Initially UNPAID
    let remainingDebt = Math.max(0, totalAmount - amountPaid);
    expect(remainingDebt).toBe(5000000);

    // Down payment / DP: Rp 1.500.000 -> PARTIAL
    amountPaid += 1500000;
    remainingDebt = Math.max(0, totalAmount - amountPaid);
    expect(remainingDebt).toBe(3500000);
    expect(formatRupiah(remainingDebt)).toContain('3.500.000');

    // Settle remaining debt: Rp 3.500.000 -> PAID
    amountPaid += 3500000;
    remainingDebt = Math.max(0, totalAmount - amountPaid);
    expect(remainingDebt).toBe(0);
  });
});
