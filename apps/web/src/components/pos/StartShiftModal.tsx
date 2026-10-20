import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DollarSign, AlertCircle, Sparkles } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { api } from '../../lib/api';
import { formatRupiah } from '../../lib/utils';

interface StartShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const StartShiftModal: React.FC<StartShiftModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [startingCash, setStartingCash] = useState<number>(200000);
  const [notes, setNotes] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const startMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/shifts/start', {
        startingCash: Number(startingCash) || 0,
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
      setErrorMsg(err.message || 'Gagal membuka shift kasir.');
    },
  });

  const quickNominals = [100000, 200000, 300000, 500000];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    startMutation.mutate();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Buka Shift Kasir Baru"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 bg-brand-50 border border-brand-200/60 rounded-lg flex items-start gap-2.5">
          <Sparkles className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
          <p className="text-xs text-brand-800 leading-relaxed">
            Masukkan jumlah modal uang kembalian (petty cash) yang ada di laci kasir saat ini sebelum memulai melayani transaksi.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <p className="text-xs text-rose-700">{errorMsg}</p>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
            Modal Awal Kasir (Uang Pecahan) <span className="text-rose-500">*</span>
          </label>
          <Input
            type="number"
            min="0"
            step="1000"
            value={startingCash}
            onChange={(e) => setStartingCash(Number(e.target.value))}
            prefixElement={<span className="text-xs font-bold text-ink-muted">Rp</span>}
            required
            autoFocus
          />
          <div className="text-xs text-ink-muted mt-1 font-medium">
            Terbaca: <span className="font-bold text-ink">{formatRupiah(startingCash || 0)}</span>
          </div>
        </div>

        {/* Quick Nominal Chips */}
        <div>
          <span className="text-[11px] text-ink-muted font-medium block mb-1.5">Pilihan Nominal Cepat:</span>
          <div className="flex flex-wrap gap-2">
            {quickNominals.map((nom) => (
              <button
                type="button"
                key={nom}
                onClick={() => setStartingCash(nom)}
                className={`text-xs px-2.5 py-1 rounded-md border transition-all ${
                  startingCash === nom
                    ? 'bg-brand-600 text-white border-brand-600 font-semibold shadow-xs'
                    : 'bg-white text-ink border-surface-border hover:bg-surface-muted'
                }`}
              >
                {formatRupiah(nom)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
            Catatan Shift (Opsional)
          </label>
          <Input
            type="text"
            placeholder="Contoh: Shift Pagi Kasir 1 / Laci Kiri"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-surface-border">
          <Button type="button" variant="outline" onClick={onClose} disabled={startMutation.isPending}>
            Batal
          </Button>
          <Button
            type="submit"
            disabled={startMutation.isPending || startingCash < 0}
            className="flex items-center gap-2"
          >
            <DollarSign className="w-4 h-4" />
            {startMutation.isPending ? 'Membuka...' : 'Buka Shift Sekarang'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
