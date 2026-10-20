import React from 'react';
import { History, User as UserIcon } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Product } from '../../types/product';
import { formatDate, formatNumber, getMovementDetails } from '../../lib/utils';

interface StockHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

export const StockHistoryModal: React.FC<StockHistoryModalProps> = ({
  isOpen,
  onClose,
  product,
}) => {
  if (!product) return null;

  const movements = product.stockMovements || [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Riwayat Audit Mutasi Stok"
      description={`Log lengkap perubahan stok untuk: ${product.name} (${product.sku})`}
      size="xl"
      footer={
        <Button variant="outline" size="sm" onClick={onClose}>
          Tutup
        </Button>
      }
    >
      <div className="space-y-4">
        {/* Current status banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-surface-subtle border border-surface-border rounded-lg text-xs">
          <div>
            <span className="text-ink-muted">Satuan Dasar: </span>
            <span className="font-bold text-ink">{product.baseUnit}</span>
          </div>
          <div>
            <span className="text-ink-muted">Stok Saat Ini: </span>
            <span className="font-bold text-brand-600 text-sm">
              {formatNumber(product.currentStock)} {product.baseUnit}
            </span>
          </div>
          <div>
            <span className="text-ink-muted">Batas Minimum: </span>
            <span className="font-semibold text-amber-700">
              {formatNumber(product.minStock)} {product.baseUnit}
            </span>
          </div>
        </div>

        {/* Audit Trail List */}
        {movements.length === 0 ? (
          <div className="py-12 text-center text-ink-muted space-y-2">
            <History className="w-8 h-8 mx-auto text-ink-subtle opacity-50" />
            <p className="text-sm font-medium">Belum ada riwayat mutasi stok untuk produk ini.</p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-surface-border rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-muted border-b border-surface-border text-ink font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Waktu</th>
                  <th className="px-4 py-3">Tipe Mutasi</th>
                  <th className="px-4 py-3 text-right">Jumlah</th>
                  <th className="px-4 py-3 text-right">Stok Awal → Akhir</th>
                  <th className="px-4 py-3">Petugas</th>
                  <th className="px-4 py-3">Keterangan / Alasan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border bg-white">
                {movements.map((m) => {
                  const details = getMovementDetails(m.type);
                  const isPositive = m.type === 'IN' || m.type === 'RETURN';
                  return (
                    <tr key={m.id} className="hover:bg-surface-subtle/50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-ink-muted font-medium">
                        {formatDate(m.createdAt)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge className={details.color}>{details.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap font-bold">
                        <span className={isPositive ? 'text-emerald-600' : 'text-rose-600'}>
                          {isPositive ? '+' : '-'}
                          {formatNumber(m.quantity)} {product.baseUnit}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap text-ink-muted">
                        <span>{formatNumber(m.previousStock)}</span>
                        <span className="mx-1 text-ink-subtle">→</span>
                        <span className="font-semibold text-ink">
                          {formatNumber(m.currentStock)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-ink">
                        <div className="flex items-center gap-1.5">
                          <UserIcon className="w-3.5 h-3.5 text-ink-muted" />
                          <span>{m.user?.name || 'Sistem'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-ink-muted max-w-xs truncate">
                        {m.note || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Modal>
  );
};
