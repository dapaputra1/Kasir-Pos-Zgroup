import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CreditCard } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { api } from '../../lib/api';
import { formatRupiah } from '../../lib/utils';
import { Purchase } from '../../types/supplier';

interface DebtPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchase: Purchase | null;
  onSuccess?: () => void;
}

export const DebtPaymentModal: React.FC<DebtPaymentModalProps> = ({
  isOpen,
  onClose,
  purchase,
  onSuccess,
}) => {
  const queryClient = useQueryClient();

  const total = Number(purchase?.totalAmount || 0);
  const paid = Number(purchase?.amountPaid || 0);
  const remainingDebt = Math.max(0, total - paid);

  const [amount, setAmount] = useState<number>(remainingDebt);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'TRANSFER' | 'QRIS'>('TRANSFER');
  const [note, setNote] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  React.useEffect(() => {
    if (purchase) {
      const rem = Math.max(0, Number(purchase.totalAmount) - Number(purchase.amountPaid));
      setAmount(rem);
      setPaymentMethod('TRANSFER');
      setNote('');
      setErrorMsg(null);
    }
  }, [purchase, isOpen]);

  const paymentMutation = useMutation({
    mutationFn: async () => {
      if (!purchase) return;
      if (amount <= 0) {
        throw new Error('Nominal pembayaran harus lebih besar dari 0.');
      }
      if (amount > remainingDebt) {
        throw new Error(`Nominal pembayaran melebihi sisa hutang (${formatRupiah(remainingDebt)}).`);
      }

      return api.post(`/purchases/${purchase.id}/payments`, {
        amount,
        paymentMethod,
        note: note.trim() || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['purchases-summary'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-detail', purchase?.id] });
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (err: any) => {
      setErrorMsg(err?.response?.data?.message || err.message || 'Gagal mencatat pembayaran.');
    },
  });

  if (!purchase) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Bayar / Cicil Hutang Pembelian Tempo"
      size="md"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          paymentMutation.mutate();
        }}
        className="space-y-4"
      >
        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-2">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
            <div className="flex-1">{errorMsg}</div>
          </div>
        )}

        {/* Invoice Summary Box */}
        <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs space-y-1.5">
          <div className="flex justify-between">
            <span className="text-amber-800">No. Faktur Kulakan:</span>
            <span className="font-bold text-amber-950">{purchase.purchaseNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-amber-800">Supplier:</span>
            <span className="font-semibold text-amber-950">{purchase.supplier?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-amber-800">Total Nilai Faktur:</span>
            <span className="font-semibold text-amber-950">{formatRupiah(total)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-amber-800">Sudah Terbayar:</span>
            <span className="font-semibold text-emerald-700">{formatRupiah(paid)}</span>
          </div>
          <div className="pt-1.5 border-t border-amber-200/80 flex justify-between font-bold text-sm">
            <span className="text-amber-900">Sisa Hutang:</span>
            <span className="text-rose-700">{formatRupiah(remainingDebt)}</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
            Nominal Pembayaran (Rp) <span className="text-rose-500">*</span>
          </label>
          <Input
            type="number"
            min="1000"
            max={remainingDebt}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="text-base font-bold text-gray-900"
          />
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={() => setAmount(remainingDebt)}
              className="text-[11px] px-2 py-1 rounded bg-brand-50 text-brand-700 hover:bg-brand-100 font-semibold"
            >
              Bayar Lunas ({formatRupiah(remainingDebt)})
            </button>
            {remainingDebt > 100000 && (
              <button
                type="button"
                onClick={() => setAmount(Math.round(remainingDebt / 2))}
                className="text-[11px] px-2 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 font-semibold"
              >
                Bayar 50% ({formatRupiah(Math.round(remainingDebt / 2))})
              </button>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
            Metode Pembayaran
          </label>
          <Select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as any)}
            options={[
              { value: 'TRANSFER', label: 'Transfer Bank (BCA / Mandiri / BRI)' },
              { value: 'CASH', label: 'Tunai (Kas Toko)' },
              { value: 'QRIS', label: 'QRIS' },
            ]}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
            Catatan / Bukti Transfer (Opsional)
          </label>
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Misal: Ref transfer BCA 981249 a.n PT Indofood"
          />
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={paymentMutation.isPending}>
            Batal
          </Button>
          <Button type="submit" isLoading={paymentMutation.isPending} className="flex items-center gap-1.5">
            <CreditCard className="w-4 h-4" />
            <span>Konfirmasi Pembayaran</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
};
