import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format currency to IDR without trailing decimals for whole rupiah
 */
export function formatRupiah(amount: number | string | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(Number(amount))) {
    return 'Rp 0';
  }
  const numeric = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numeric);
}

/**
 * Format general numbers with Indonesian separators (e.g. 1.250)
 */
export function formatNumber(value: number | string | undefined | null): string {
  if (value === undefined || value === null || isNaN(Number(value))) {
    return '0';
  }
  const numeric = typeof value === 'string' ? parseFloat(value) : value;
  // If it's an integer, don't show decimals
  if (Number.isInteger(numeric)) {
    return new Intl.NumberFormat('id-ID').format(numeric);
  }
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(numeric);
}

/**
 * Format date time to readable Indonesian format
 */
export function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return dateString;
  }
}

/**
 * Human-readable role translations and styles
 */
export function getRoleDetails(role: string) {
  switch (role) {
    case 'OWNER':
      return { label: 'Owner / Pemilik', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
    case 'ADMIN':
      return { label: 'Admin Operasional', color: 'bg-blue-100 text-blue-800 border-blue-200' };
    case 'CASHIER':
      return { label: 'Kasir', color: 'bg-amber-100 text-amber-800 border-amber-200' };
    case 'WAREHOUSE':
      return { label: 'Petugas Gudang', color: 'bg-purple-100 text-purple-800 border-purple-200' };
    default:
      return { label: role, color: 'bg-gray-100 text-gray-800 border-gray-200' };
  }
}

/**
 * Movement type details
 */
export function getMovementDetails(type: string) {
  switch (type) {
    case 'IN':
      return { label: 'Masuk / Beli', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'OUT':
      return { label: 'Keluar / Jual', color: 'bg-rose-50 text-rose-700 border-rose-200' };
    case 'ADJUSTMENT':
      return { label: 'Koreksi Opname', color: 'bg-blue-50 text-blue-700 border-blue-200' };
    case 'RETURN':
      return { label: 'Retur Barang', color: 'bg-amber-50 text-amber-700 border-amber-200' };
    default:
      return { label: type, color: 'bg-gray-50 text-gray-700 border-gray-200' };
  }
}
