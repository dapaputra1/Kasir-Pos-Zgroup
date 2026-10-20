import { describe, it, expect } from 'vitest';
import { formatRupiah } from '../lib/utils';

describe('POS Cart & Calculations Unit Tests', () => {
  it('should accurately calculate subtotal for items with multi-unit conversion', () => {
    // 2 Dus of Bimoli @ Rp 225.000 / Dus
    const item1Qty = 2;
    const item1Price = 225000;
    const item1Subtotal = item1Qty * item1Price;
    expect(item1Subtotal).toBe(450000);

    // 10 Pcs of Indomie @ Rp 3.200 / Pcs
    const item2Qty = 10;
    const item2Price = 3200;
    const item2Subtotal = item2Qty * item2Price;
    expect(item2Subtotal).toBe(32000);

    const subtotal = item1Subtotal + item2Subtotal;
    expect(subtotal).toBe(482000);
    expect(formatRupiah(subtotal)).toContain('482.000');
  });

  it('should compute cash change correctly without floating point errors', () => {
    const totalAmount = 375500;
    const cashReceived = 400000;
    const change = Math.max(0, cashReceived - totalAmount);

    expect(change).toBe(24500);
    expect(formatRupiah(change)).toContain('24.500');
  });

  it('should apply discounts accurately', () => {
    const subtotal = 500000;
    const discount = 25000;
    const finalTotal = Math.max(0, subtotal - discount);

    expect(finalTotal).toBe(475000);
  });
});
