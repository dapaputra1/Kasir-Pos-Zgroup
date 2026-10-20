import { describe, it, expect } from 'vitest';
import { formatRupiah, formatNumber, getRoleDetails, getMovementDetails } from '../lib/utils';

describe('Frontend Utilities and Formatters', () => {
  it('should correctly format currency into IDR without decimals', () => {
    expect(formatRupiah(14500)).toContain('14.500');
    expect(formatRupiah(350000)).toContain('350.000');
    expect(formatRupiah(0)).toContain('0');
    expect(formatRupiah(null)).toBe('Rp 0');
  });

  it('should format numbers with thousands separators', () => {
    expect(formatNumber(500)).toBe('500');
    expect(formatNumber(1250)).toBe('1.250');
    expect(formatNumber(0)).toBe('0');
  });

  it('should return human readable role details in Indonesian', () => {
    const owner = getRoleDetails('OWNER');
    expect(owner.label).toBe('Owner / Pemilik');

    const cashier = getRoleDetails('CASHIER');
    expect(cashier.label).toBe('Kasir');

    const admin = getRoleDetails('ADMIN');
    expect(admin.label).toBe('Admin Operasional');

    const warehouse = getRoleDetails('WAREHOUSE');
    expect(warehouse.label).toBe('Petugas Gudang');
  });

  it('should return movement type details and labels', () => {
    expect(getMovementDetails('IN').label).toContain('Masuk');
    expect(getMovementDetails('OUT').label).toContain('Keluar');
    expect(getMovementDetails('ADJUSTMENT').label).toContain('Koreksi');
    expect(getMovementDetails('RETURN').label).toContain('Retur');
  });
});
