import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Wallet,
  AlertCircle,
  CheckCircle2,
  Printer,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { api } from '../../lib/api';
import { formatRupiah, formatNumber } from '../../lib/utils';
import { CashShift } from '../../types/shift';

interface CloseShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  shiftData: CashShift | null;
  onSuccess?: () => void;
}

export const CloseShiftModal: React.FC<CloseShiftModalProps> = ({
  isOpen,
  onClose,
  shiftData,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [closingCash, setClosingCash] = useState<number>(
    shiftData?.metrics?.expectedCash ?? 0
  );
  const [notes, setNotes] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync initial closing cash when shift data loads
  React.useEffect(() => {
    if (shiftData?.metrics) {
      setClosingCash(shiftData.metrics.expectedCash);
    }
  }, [shiftData]);

  const closeMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/shifts/close', {
        closingCash: Number(closingCash) || 0,
        notes: notes.trim() || undefined,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-shift'] });
      queryClient.invalidateQueries({ queryKey: ['shifts-history'] });
      onClose();
      if (onSuccess) onSuccess();
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Gagal menutup shift kasir.');
    },
  });

  if (!shiftData) return null;

  const expectedCash = shiftData.metrics?.expectedCash ?? shiftData.startingCash;
  const difference = (closingCash || 0) - expectedCash;

  const handlePrintZReport = () => {
    window.print();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    closeMutation.mutate();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Tutup Shift & Rekonsiliasi Kas Laci"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <p className="text-xs text-rose-700">{errorMsg}</p>
          </div>
        )}

        {/* Shift Summary Card */}
        <div className="p-4 bg-surface-muted/60 border border-surface-border rounded-xl space-y-2.5 text-xs">
          <div className="flex justify-between items-center pb-2 border-b border-surface-border">
            <span className="text-ink-muted">Petugas Kasir:</span>
            <span className="font-bold text-ink">{shiftData.user.name}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-ink-muted">Waktu Buka Shift:</span>
            <span className="font-medium text-ink">
              {new Date(shiftData.startTime).toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
              })} WIB
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-ink-muted">Modal Awal Kasir:</span>
            <span className="font-semibold text-ink">{formatRupiah(shiftData.startingCash)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-ink-muted">Total Penjualan Tunai ({formatNumber(shiftData.metrics?.totalOrdersCount ?? 0)} Trx):</span>
            <span className="font-semibold text-emerald-700">
              +{formatRupiah(shiftData.metrics?.totalCashSales ?? 0)}
            </span>
          </div>
          {(shiftData.metrics?.totalCashDebtPaid ?? 0) > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-ink-muted">Pelunasan Bon Tunai:</span>
              <span className="font-semibold text-emerald-700">
                +{formatRupiah(shiftData.metrics?.totalCashDebtPaid ?? 0)}
              </span>
            </div>
          )}
          {(shiftData.metrics?.totalCashRefunds ?? 0) > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-ink-muted">Retur Tunai Keluar:</span>
              <span className="font-semibold text-rose-700">
                -{formatRupiah(shiftData.metrics?.totalCashRefunds ?? 0)}
              </span>
            </div>
          )}
          <div className="pt-2.5 border-t border-surface-border flex justify-between items-center">
            <span className="font-bold text-ink uppercase tracking-wider text-[11px]">
              Ekspektasi Kas Sistem:
            </span>
            <span className="text-base font-black text-brand-700">
              {formatRupiah(expectedCash)}
            </span>
          </div>
        </div>

        {/* Input Actual Closing Cash */}
        <div>
          <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
            Uang Fisik Hasil Hitungan Kasir (Riil di Laci) <span className="text-rose-500">*</span>
          </label>
          <Input
            type="number"
            min="0"
            step="1000"
            value={closingCash}
            onChange={(e) => setClosingCash(Number(e.target.value))}
            prefixElement={<span className="text-xs font-bold text-ink-muted">Rp</span>}
            required
            autoFocus
          />
          <div className="text-xs text-ink-muted mt-1 font-medium">
            Terbaca: <span className="font-bold text-ink">{formatRupiah(closingCash || 0)}</span>
          </div>
        </div>

        {/* Live Discrepancy Indicator */}
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between ${
            difference === 0
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
              : difference > 0
              ? 'bg-blue-50/70 border-blue-200 text-blue-900'
              : 'bg-rose-50/70 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {difference === 0 ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : difference > 0 ? (
              <TrendingUp className="w-5 h-5 text-blue-600 shrink-0" />
            ) : (
              <TrendingDown className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <div>
              <div className="text-xs font-bold">
                {difference === 0
                  ? 'Kas Seimbang (Match 100%)'
                  : difference > 0
                  ? 'Surplus Uang Kas (Lebih)'
                  : 'Defisit Uang Kas (Kurang)'}
              </div>
              <div className="text-[11px] opacity-80">
                {difference === 0
                  ? 'Uang fisik di laci cocok dengan catatan transaksi sistem.'
                  : difference > 0
                  ? 'Ada kelebihan uang fisik di laci kasir.'
                  : 'Uang fisik di laci lebih sedikit dari catatan sistem.'}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-ink-muted">Selisih:</div>
            <div className="text-base font-black">
              {difference > 0 ? `+${formatRupiah(difference)}` : formatRupiah(difference)}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
            Catatan Rekonsiliasi (Opsional)
          </label>
          <Input
            type="text"
            placeholder="Keterangan jika terdapat selisih uang kas..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex justify-between items-center pt-3 border-t border-surface-border">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrintZReport}
            className="flex items-center gap-1.5 text-xs text-ink-muted"
          >
            <Printer className="w-3.5 h-3.5" />
            Cetak Ringkasan (Z-Report)
          </Button>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={closeMutation.isPending}>
              Batal
            </Button>
            <Button
              type="submit"
              variant="danger"
              disabled={closeMutation.isPending || closingCash < 0}
              className="flex items-center gap-2"
            >
              <Wallet className="w-4 h-4" />
              {closeMutation.isPending ? 'Menutup...' : 'Tutup Shift Sekarang'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
