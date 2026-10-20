import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RotateCcw, Search, AlertCircle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { api } from '../../lib/api';
import { formatRupiah, formatNumber } from '../../lib/utils';

interface PurchaseOption {
  id: number;
  purchaseNumber: string;
  totalAmount: number;
  paymentType: string;
  supplier: { id: number; name: string };
  items: Array<{
    productId: number;
    productName: string;
    unitName: string;
    quantity: number;
    unitCost: number;
  }>;
}

interface CreatePurchaseReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CreatePurchaseReturnModal: React.FC<CreatePurchaseReturnModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<number | null>(null);
  const [searchPurchase, setSearchPurchase] = useState('');
  const [reason, setReason] = useState('');
  const [refundMethod, setRefundMethod] = useState<'DEBT_OFFSET' | 'CASH'>('DEBT_OFFSET');
  const [returnItems, setReturnItems] = useState<{ [key: string]: number }>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch recent purchases
  const { data: purchases = [] } = useQuery<PurchaseOption[]>({
    queryKey: ['recent-purchases-for-return', searchPurchase],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('limit', '20');
      if (searchPurchase.trim()) params.append('search', searchPurchase.trim());
      const res = await api.get(`/purchases?${params.toString()}`);
      return res.data.data.purchases;
    },
    enabled: isOpen,
  });

  const selectedPurchase = purchases.find((p) => p.id === selectedPurchaseId);

  const returnMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPurchase) throw new Error('Pilih faktur pembelian terlebih dahulu.');

      const itemsPayload = Object.entries(returnItems)
        .filter(([_, qty]) => qty > 0)
        .map(([key, qty]) => {
          const [prodId, uName] = key.split('_');
          return {
            productId: Number(prodId),
            unitName: uName,
            quantity: Number(qty),
          };
        });

      if (itemsPayload.length === 0) {
        throw new Error('Masukkan minimal satu kuantitas barang yang ingin dikembalikan.');
      }

      const res = await api.post('/returns/purchases', {
        purchaseId: selectedPurchase.id,
        reason: reason.trim() || 'Barang rusak / kedaluwarsa dari distributor',
        refundMethod,
        items: itemsPayload,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-returns'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      onClose();
      if (onSuccess) onSuccess();
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Gagal memproses retur pembelian ke supplier.');
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
    if (!selectedPurchase) return 0;
    let sum = 0;
    for (const item of selectedPurchase.items) {
      const qty = returnItems[`${item.productId}_${item.unitName}`] || 0;
      sum += qty * Number(item.unitCost);
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
      title="Proses Retur Pembelian ke Supplier"
      size="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <p className="text-xs text-rose-700">{errorMsg}</p>
          </div>
        )}

        {/* Select Purchase */}
        <div>
          <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
            Pilih Faktur Pembelian (No. PB) <span className="text-rose-500">*</span>
          </label>
          <div className="flex gap-2 mb-2">
            <Input
              type="text"
              placeholder="Cari no. pembelian / supplier..."
              value={searchPurchase}
              onChange={(e) => setSearchPurchase(e.target.value)}
              prefixElement={<Search className="w-4 h-4 text-ink-muted" />}
              className="text-xs h-9"
            />
          </div>

          <Select
            value={selectedPurchaseId ? String(selectedPurchaseId) : ''}
            onChange={(e) => {
              const val = Number(e.target.value);
              setSelectedPurchaseId(val || null);
              setReturnItems({});
            }}
            options={[
              { value: '', label: '-- Pilih Faktur Pembelian Supplier --' },
              ...purchases.map((p) => ({
                value: String(p.id),
                label: `${p.purchaseNumber} - ${p.supplier.name} (${formatRupiah(p.totalAmount)}) [${p.paymentType}]`,
              })),
            ]}
            required
          />
        </div>

        {/* Show Items */}
        {selectedPurchase && (
          <div className="border border-surface-border rounded-xl p-3.5 bg-surface-muted/30 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-ink border-b border-surface-border pb-2">
              <span>Barang Masuk Pada Faktur Ini:</span>
              <span className="text-ink-muted font-normal">
                Supplier: <strong className="text-ink">{selectedPurchase.supplier.name}</strong>
              </span>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {selectedPurchase.items.map((item) => {
                const returnQty = returnItems[`${item.productId}_${item.unitName}`] || 0;
                return (
                  <div
                    key={`${item.productId}_${item.unitName}`}
                    className="flex items-center justify-between gap-3 p-2.5 bg-white border border-surface-border rounded-lg text-xs"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-ink truncate">{item.productName}</div>
                      <div className="text-[11px] text-ink-muted">
                        Beli: {formatNumber(item.quantity)} {item.unitName} @ {formatRupiah(item.unitCost)}
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
              <span className="font-semibold text-ink">Total Nilai Klaim Retur:</span>
              <span className="text-base font-black text-blue-700">
                {formatRupiah(calculateTotalReturn())}
              </span>
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
            Metode Kompensasi Dari Supplier
          </label>
          <Select
            value={refundMethod}
            onChange={(e) => setRefundMethod(e.target.value as any)}
            options={[
              { value: 'DEBT_OFFSET', label: 'Potong Sisa Hutang Kulakan Supplier' },
              { value: 'CASH', label: 'Pengembalian Uang Tunai / Transfer' },
            ]}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
            Alasan Retur ke Distributor <span className="text-rose-500">*</span>
          </label>
          <Input
            type="text"
            placeholder="Contoh: Barang cacat dari pabrik, mendekati kadaluwarsa"
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
            disabled={returnMutation.isPending || !selectedPurchaseId || calculateTotalReturn() <= 0}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <RotateCcw className="w-4 h-4" />
            {returnMutation.isPending ? 'Memproses...' : 'Konfirmasi Retur ke Supplier'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
