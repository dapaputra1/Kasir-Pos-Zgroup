import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Printer, CheckCircle2, RotateCcw, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { Order } from '../../types/pos';
import { formatRupiah, formatDate, formatNumber } from '../../lib/utils';
import { api } from '../../lib/api';
import { StoreSetting } from '../../types/setting';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  onNewTransaction: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  order,
  onNewTransaction,
}) => {
  const { data: setting } = useQuery<StoreSetting>({
    queryKey: ['store-settings'],
    queryFn: async () => {
      const res = await api.get('/settings');
      return res.data.data;
    },
    enabled: isOpen,
  });

  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  const is80mm = setting?.paperSize === '80mm';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-ink/70 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className={`relative w-full ${is80mm ? 'max-w-md' : 'max-w-sm'} bg-white rounded-xl shadow-2xl border border-surface-border z-10 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150`}>
        {/* Header Bar */}
        <div className="px-4 py-3 bg-brand-500 text-white flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-1.5 font-bold text-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            <span>Pembayaran Berhasil! ({setting?.paperSize || '58mm'})</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-brand-100 hover:text-white rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Thermal Receipt Paper Canvas */}
        <div
          id="printable-receipt"
          className="p-6 overflow-y-auto flex-1 font-mono text-xs text-ink space-y-3 bg-[#FCFCFD]"
        >
          {/* Receipt Store Header */}
          <div className="text-center space-y-1 pb-2 border-b border-dashed border-gray-400">
            <h2 className="font-black text-base tracking-tight uppercase">
              {setting?.storeName || 'GrosirPOS Sembako'}
            </h2>
            {setting?.tagline && <p className="text-[10px] text-gray-500">{setting.tagline}</p>}
            <p className="text-[10px] text-gray-500">
              {setting?.address || 'Jl. Pasar Induk Sembako'}
              {setting?.phone ? ` • Telp: ${setting.phone}` : ''}
            </p>
          </div>

          {/* Receipt Meta */}
          <div className="text-[11px] space-y-0.5 pb-2 border-b border-dashed border-gray-400">
            <div className="flex justify-between">
              <span>No Faktur:</span>
              <span className="font-bold">{order.invoiceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span>Tanggal:</span>
              <span>{formatDate(order.createdAt)}</span>
            </div>
            <div className="flex justify-between">
              <span>Kasir:</span>
              <span>{order.user?.name || 'Kasir'}</span>
            </div>
            {order.customer && (
              <div className="flex justify-between">
                <span>Pelanggan:</span>
                <span className="font-bold">{order.customer.name}</span>
              </div>
            )}
          </div>

          {/* Items Breakdown */}
          <div className="space-y-2 py-1">
            {order.items?.map((item) => (
              <div key={item.id} className="space-y-0.5">
                <div className="font-bold text-[11px] leading-tight text-ink">
                  {item.productName}
                </div>
                <div className="flex justify-between text-[11px] text-gray-600">
                  <span>
                    {formatNumber(item.quantity)} {item.unitName} x {formatRupiah(item.unitPrice)}
                  </span>
                  <span className="font-bold text-ink">{formatRupiah(item.totalAmount)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Calculation summary */}
          <div className="pt-2 border-t border-dashed border-gray-400 space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatRupiah(order.subtotal)}</span>
            </div>
            {Number(order.discountAmount) > 0 && (
              <div className="flex justify-between text-rose-600">
                <span>Diskon:</span>
                <span>-{formatRupiah(order.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between font-black text-sm pt-1 border-t border-gray-300">
              <span>TOTAL BAYAR:</span>
              <span className="text-brand-600">{formatRupiah(order.totalAmount)}</span>
            </div>
            <div className="flex justify-between pt-1">
              <span>Metode:</span>
              <span className="font-bold">{order.paymentMethod}</span>
            </div>
            <div className="flex justify-between">
              <span>Uang Diterima:</span>
              <span>{formatRupiah(order.amountPaid)}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>Kembalian:</span>
              <span>{formatRupiah(order.changeAmount)}</span>
            </div>
          </div>

          {/* Receipt Footer */}
          <div className="text-center pt-3 border-t border-dashed border-gray-400 text-[10px] text-gray-500 space-y-0.5">
            <p className="font-semibold text-gray-700">*** TERIMA KASIH ***</p>
            {setting?.footerReceipt ? (
              <div className="whitespace-pre-line leading-relaxed">{setting.footerReceipt}</div>
            ) : (
              <p>Barang yang sudah dibeli tidak dapat ditukar/dikembalikan tanpa nota ini.</p>
            )}
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="p-3 bg-surface-muted border-t border-surface-border flex items-center justify-between gap-2 shrink-0 print:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={onNewTransaction}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            Transaksi Baru
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handlePrint}
            leftIcon={<Printer className="w-3.5 h-3.5" />}
          >
            Cetak Struk
          </Button>
        </div>
      </div>
    </div>
  );
};
