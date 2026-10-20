import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Boxes, ArrowRight } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Product } from '../../types/product';
import { formatNumber } from '../../lib/utils';

const adjustSchema = z.object({
  type: z.enum(['IN', 'OUT', 'ADJUSTMENT', 'RETURN']),
  quantity: z.coerce.number().positive('Jumlah penyesuaian harus lebih dari 0'),
  note: z.string().min(3, 'Alasan penyesuaian stok wajib diisi minimal 3 karakter'),
});

type AdjustFormData = z.infer<typeof adjustSchema>;

interface StockAdjustModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onSubmit: (data: AdjustFormData) => Promise<void>;
  isLoading?: boolean;
}

export const StockAdjustModal: React.FC<StockAdjustModalProps> = ({
  isOpen,
  onClose,
  product,
  onSubmit,
  isLoading = false,
}) => {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<AdjustFormData>({
    resolver: zodResolver(adjustSchema),
    defaultValues: {
      type: 'IN',
      quantity: 1,
      note: '',
    },
  });

  const selectedType = watch('type');
  const inputQuantity = watch('quantity') || 0;

  if (!product) return null;

  const currentStock = Number(product.currentStock);
  const qty = Number(inputQuantity);

  let projectedStock = currentStock;
  if (selectedType === 'IN' || selectedType === 'RETURN') {
    projectedStock = currentStock + qty;
  } else if (selectedType === 'OUT') {
    projectedStock = Math.max(0, currentStock - qty);
  } else if (selectedType === 'ADJUSTMENT') {
    projectedStock = qty;
  }

  const handleFormSubmit = async (data: AdjustFormData) => {
    await onSubmit(data);
    reset();
  };

  const typeOptions = [
    { value: 'IN', label: 'Barang Masuk / Pembelian Tambahan (+)' },
    { value: 'OUT', label: 'Barang Keluar / Rusak / Hilang (-)' },
    { value: 'ADJUSTMENT', label: 'Stock Opname / Koreksi Fisik Langsung (=)' },
    { value: 'RETURN', label: 'Retur dari Pelanggan (+)' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Penyesuaian Stok (Audit Trail)"
      description={`Koreksi atau tambah stok fisik untuk: ${product.name} (${product.sku})`}
      size="md"
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        {/* Real-time Calculation Summary Card */}
        <div className="bg-surface-subtle p-3.5 rounded-lg border border-surface-border">
          <div className="flex items-center justify-between text-xs text-ink-muted mb-1">
            <span>Stok Sistem Saat Ini</span>
            <span>Perkiraan Hasil Akhir</span>
          </div>
          <div className="flex items-center justify-between font-bold text-ink">
            <span className="text-base text-ink">
              {formatNumber(currentStock)} {product.baseUnit}
            </span>
            <ArrowRight className="w-4 h-4 text-brand-600" />
            <span
              className={`text-lg ${
                projectedStock < Number(product.minStock) ? 'text-amber-600' : 'text-brand-600'
              }`}
            >
              {formatNumber(projectedStock)} {product.baseUnit}
            </span>
          </div>
        </div>

        <Select
          label="Jenis Penyesuaian"
          required
          options={typeOptions}
          error={errors.type?.message}
          {...register('type')}
        />

        <Input
          label={
            selectedType === 'ADJUSTMENT'
              ? `Jumlah Fisik Sebenarnya (${product.baseUnit})`
              : `Jumlah Perubahan (${product.baseUnit})`
          }
          type="number"
          min="0"
          step="any"
          required
          placeholder="0"
          suffixElement={product.baseUnit}
          onKeyDown={(e) => {
            if (e.key === '-' || e.key === 'e') e.preventDefault();
          }}
          error={errors.quantity?.message}
          {...register('quantity')}
        />

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-ink uppercase tracking-wider">
            Alasan / Catatan Audit <span className="text-rose-500">*</span>
          </label>
          <textarea
            rows={3}
            required
            placeholder="Contoh: Penerimaan faktur no. INV-998 atau Hasil opname fisik akhir pekan..."
            className="w-full bg-white text-ink text-sm rounded-md border border-surface-border p-3 transition-colors placeholder:text-ink-subtle focus:outline-none focus:ring-2 focus:ring-brand-500"
            {...register('note')}
          />
          {errors.note && <p className="text-xs text-rose-600 font-medium">{errors.note.message}</p>}
        </div>

        {/* Modal Actions */}
        <div className="pt-3 border-t border-surface-border flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Batal
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
            leftIcon={<Boxes className="w-4 h-4" />}
          >
            Simpan & Catat Mutasi
          </Button>
        </div>
      </form>
    </Modal>
  );
};
