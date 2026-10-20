import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RotateCcw, Search, AlertCircle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { api } from '../../lib/api';
import { formatRupiah, formatNumber } from '../../lib/utils';

interface OrderOption {
  id: number;
  invoiceNumber: string;
  totalAmount: number;
  paymentMethod: string;
  customer?: { id: number; name: string } | null;
  items: Array<{
    productId: number;
    productName: string;
    unitName: string;
    quantity: number;
    unitPrice: number;
  }>;
}

interface CreateSaleReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CreateSaleReturnModal: React.FC<CreateSaleReturnModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [searchInvoice, setSearchInvoice] = useState('');
  const [reason, setReason] = useState('');
  const [refundMethod, setRefundMethod] = useState<'CASH' | 'CREDIT_OFFSET' | 'NO_REFUND'>('CASH');
  const [returnToStock, setReturnToStock] = useState(true);
  const [returnItems, setReturnItems] = useState<{ [key: string]: number }>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch recent completed sales orders
  const { data: orders = [] } = useQuery<OrderOption[]>({
    queryKey: ['recent-orders-for-return', searchInvoice],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('limit', '20');
      if (searchInvoice.trim()) params.append('search', searchInvoice.trim());
      const res = await api.get(`/pos/sales?${params.toString()}`);
      return res.data.data.orders;
    },
    enabled: isOpen,
  });

  const selectedOrder = orders.find((o) => o.id === selectedOrderId);

  const returnMutation = useMutation({
    mutationFn: async () => {
      if (!selectedOrder) throw new Error('Pilih faktur penjualan terlebih dahulu.');

      const itemsPayload = Object.entries(returnItems)
        .filter(([_, qty]) => qty > 0)
        .map(([key, qty]) => {
          const [prodId, uName] = key.split('_');
          return {
            productId: Number(prodId),
            unitName: uName,
            quantity: Number(qty),
            returnToStock,
          };
        });

      if (itemsPayload.length === 0) {
        throw new Error('Masukkan minimal satu kuantitas barang yang ingin diretur.');
      }

      const res = await api.post('/returns/sales', {
        orderId: selectedOrder.id,
        reason: reason.trim() || 'Barang rusak / salah barang',
        refundMethod,
        items: itemsPayload,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sale-returns'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['pos-sales'] });
      onClose();
      if (onSuccess) onSuccess();
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Gagal memproses retur penjualan.');
    },
  });

  const handleQtyChange = (productId: number, unitName: string, val: number, maxQty: number) => {
    const safeVal = Math.max(0, Math.min(val, maxQty));
    setReturnItems((prev) => ({
      ...prev,
      [`${productId}_${unitName}`]: safeVal,
    }));
  };

  const calculateTotalReturn = () => {
    if (!selectedOrder) return 0;
    let sum = 0;
    for (const item of selectedOrder.items) {
      const qty = returnItems[`${item.productId}_${item.unitName}`] || 0;
      sum += qty * Number(item.unitPrice);
    }
    return sum;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    returnMutation.mutate();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Proses Retur Penjualan Pelanggan"
      size="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <p className="text-xs text-rose-700">{errorMsg}</p>
          </div>
        )}

        {/* Step 1: Select Invoice */}
        <div>
          <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
            Pilih Faktur Penjualan (No. Invoice) <span className="text-rose-500">*</span>
          </label>
          <div className="flex gap-2 mb-2">
            <Input
              type="text"
              placeholder="Cari no. faktur / pelanggan..."
              value={searchInvoice}
              onChange={(e) => setSearchInvoice(e.target.value)}
              prefixElement={<Search className="w-4 h-4 text-ink-muted" />}
              className="text-xs h-9"
            />
          </div>

          <Select
            value={selectedOrderId ? String(selectedOrderId) : ''}
            onChange={(e) => {
              const val = Number(e.target.value);
              setSelectedOrderId(val || null);
              setReturnItems({});
            }}
            options={[
              { value: '', label: '-- Pilih Faktur Penjualan --' },
              ...orders.map((o) => ({
                value: String(o.id),
                label: `${o.invoiceNumber} - ${o.customer?.name || 'Umum'} (${formatRupiah(o.totalAmount)}) [${o.paymentMethod}]`,
              })),
            ]}
            required
          />
        </div>

        {/* Step 2: Show Items to Return */}
        {selectedOrder && (
          <div className="border border-surface-border rounded-xl p-3.5 bg-surface-muted/30 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-ink border-b border-surface-border pb-2">
              <span>Daftar Barang Pada Faktur:</span>
              <span className="text-ink-muted font-normal">
                Metode Asli: <strong className="text-ink">{selectedOrder.paymentMethod}</strong>
              </span>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {selectedOrder.items.map((item) => {
                const returnQty = returnItems[`${item.productId}_${item.unitName}`] || 0;
                return (
                  <div
                    key={`${item.productId}_${item.unitName}`}
                    className="flex items-center justify-between gap-3 p-2.5 bg-white border border-surface-border rounded-lg text-xs"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-ink truncate">{item.productName}</div>
                      <div className="text-[11px] text-ink-muted">
                        Beli: {formatNumber(item.quantity)} {item.unitName} @ {formatRupiah(item.unitPrice)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-ink-muted">Qty Retur:</span>
                      <Input
                        type="number"
                        min="0"
                        max={item.quantity}
                        value={returnQty}
                        onChange={(e) =>
                          handleQtyChange(
                            item.productId,
                            item.unitName,
                            Number(e.target.value),
                            item.quantity
                          )
                        }
                        className="w-20 text-center text-xs h-8 font-bold"
                      />
                      <span className="text-[11px] text-ink-muted w-10">{item.unitName}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Total Return Amount Preview */}
            <div className="flex items-center justify-between pt-2 border-t border-surface-border text-xs">
              <span className="font-semibold text-ink">Estimasi Total Nilai Retur:</span>
              <span className="text-base font-black text-rose-700">
                {formatRupiah(calculateTotalReturn())}
              </span>
            </div>
          </div>
        )}

        {/* Step 3: Refund Options & Return to Stock */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
              Metode Pengembalian Dana
            </label>
            <Select
              value={refundMethod}
              onChange={(e) => setRefundMethod(e.target.value as any)}
              options={[
                { value: 'CASH', label: 'Uang Tunai (Kembalikan Kasir)' },
                { value: 'CREDIT_OFFSET', label: 'Potong Hutang Bon Pelanggan' },
                { value: 'NO_REFUND', label: 'Tanpa Refund (Tukar Barang Fisik)' },
              ]}
            />
          </div>

          <div className="flex items-center pt-6">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={returnToStock}
                onChange={(e) => setReturnToStock(e.target.checked)}
                className="w-4 h-4 text-brand-600 rounded border-gray-300 focus:ring-brand-500"
              />
              <span className="text-xs font-medium text-ink">
                Barang layak jual (kembalikan ke stok fisik)
              </span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
            Alasan Retur Barang <span className="text-rose-500">*</span>
          </label>
          <Input
            type="text"
            placeholder="Contoh: Kemasan bocor, barang cacat, salah ambil varian"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-surface-border">
          <Button type="button" variant="outline" onClick={onClose} disabled={returnMutation.isPending}>
            Batal
          </Button>
          <Button
            type="submit"
            variant="danger"
            disabled={returnMutation.isPending || !selectedOrderId || calculateTotalReturn() <= 0}
            className="flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            {returnMutation.isPending ? 'Memproses...' : 'Konfirmasi Retur Penjualan'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
