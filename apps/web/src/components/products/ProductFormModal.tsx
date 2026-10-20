import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, Info, PackagePlus, AlertCircle, Camera } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { BarcodeScannerModal } from '../pos/BarcodeScannerModal';
import { useToast } from '../ui/Toast';
import { Product } from '../../types/product';
import { Category } from '../../types/category';
import { formatNumber } from '../../lib/utils';

const unitSchema = z.object({
  id: z.number().optional(),
  unitName: z.string().min(1, 'Satuan wajib diisi').toUpperCase(),
  conversionFactor: z.coerce.number().min(1, 'Faktor konversi minimal 1 (tidak boleh minus)'),
  isBaseUnit: z.boolean().default(false),
  price: z.coerce.number().min(0, 'Harga jual tidak boleh minus'),
  wholesalePrice: z.coerce.number().min(0, 'Harga grosir tidak boleh minus').optional().nullable(),
  barcode: z.string().optional().nullable(),
});

const formSchema = z.object({
  barcode: z.string().min(1, 'Barcode utama produk wajib diisi / discan'),
  sku: z.string().optional().nullable(),
  name: z.string().min(2, 'Nama produk minimal 2 karakter'),
  categoryId: z.coerce.number({ invalid_type_error: 'Pilih kategori' }).positive('Pilih kategori'),
  description: z.string().optional().nullable(),
  baseUnit: z.string().min(1, 'Satuan dasar wajib diisi').toUpperCase(),
  minStock: z.coerce.number().min(0, 'Batas minimum tidak boleh minus').default(10),
  purchasePrice: z.coerce.number().min(0, 'HPP tidak boleh minus').default(0),
  initialStock: z.coerce.number().min(0, 'Stok awal tidak boleh minus').default(0),
  units: z.array(unitSchema).min(1, 'Minimal harus ada 1 satuan'),
});

type FormData = z.infer<typeof formSchema>;

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  initialData?: Product | null;
  onSubmit: (data: FormData) => Promise<void>;
  isLoading?: boolean;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  categories,
  initialData,
  onSubmit,
  isLoading = false,
}) => {
  const isEditing = !!initialData;
  const [scanTarget, setScanTarget] = useState<'main' | number | null>(null);
  const { success } = useToast();

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sku: '',
      barcode: '',
      name: '',
      categoryId: categories[0]?.id || 1,
      description: '',
      baseUnit: 'PCS',
      minStock: 10,
      purchasePrice: 0,
      initialStock: 0,
      units: [
        {
          unitName: 'PCS',
          conversionFactor: 1,
          isBaseUnit: true,
          price: 0,
          wholesalePrice: 0,
          barcode: '',
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'units',
  });

  const currentBaseUnit = watch('baseUnit') || 'PCS';

  // Synchronize form when editing or resetting
  useEffect(() => {
    if (initialData) {
      reset({
        sku: initialData.sku,
        barcode: initialData.barcode || '',
        name: initialData.name,
        categoryId: initialData.categoryId,
        description: initialData.description || '',
        baseUnit: initialData.baseUnit,
        minStock: Number(initialData.minStock),
        purchasePrice: Number(initialData.purchasePrice),
        initialStock: Number(initialData.currentStock),
        units: initialData.units?.map((u) => ({
          id: u.id,
          unitName: u.unitName,
          conversionFactor: Number(u.conversionFactor),
          isBaseUnit: u.isBaseUnit,
          price: Number(u.price),
          wholesalePrice: u.wholesalePrice ? Number(u.wholesalePrice) : 0,
          barcode: u.barcode || '',
        })) || [],
      });
    } else {
      reset({
        sku: '',
        barcode: '',
        name: '',
        categoryId: categories[0]?.id || 1,
        description: '',
        baseUnit: 'PCS',
        minStock: 10,
        purchasePrice: 0,
        initialStock: 0,
        units: [
          {
            unitName: 'PCS',
            conversionFactor: 1,
            isBaseUnit: true,
            price: 0,
            wholesalePrice: 0,
            barcode: '',
          },
        ],
      });
    }
  }, [initialData, categories, reset, isOpen]);

  // Keep first unit synchronized with baseUnit change
  const handleBaseUnitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    setValue('baseUnit', val);
    setValue('units.0.unitName', val);
    setValue('units.0.conversionFactor', 1);
    setValue('units.0.isBaseUnit', true);
  };

  const handleFormSubmit = async (data: FormData) => {
    // If SKU is empty, use barcode directly as the identifier
    const barcodeVal = data.barcode.trim();
    const finalSku = data.sku?.trim() || barcodeVal || `BRG-${Date.now()}`;

    // Ensure base unit is properly tagged and values have no minus
    const normalizedUnits = data.units.map((u, idx) => ({
      ...u,
      isBaseUnit: idx === 0 || u.unitName.toUpperCase() === data.baseUnit.toUpperCase(),
      conversionFactor:
        idx === 0 || u.unitName.toUpperCase() === data.baseUnit.toUpperCase()
          ? 1
          : Math.max(1, Number(u.conversionFactor) || 1),
      price: Math.max(0, Number(u.price) || 0),
      wholesalePrice: u.wholesalePrice ? Math.max(0, Number(u.wholesalePrice) || 0) : 0,
    }));

    await onSubmit({
      ...data,
      barcode: barcodeVal,
      sku: finalSku,
      minStock: Math.max(0, Number(data.minStock) || 0),
      purchasePrice: Math.max(0, Number(data.purchasePrice) || 0),
      initialStock: Math.max(0, Number(data.initialStock) || 0),
      units: normalizedUnits,
    });
  };

  const categoryOptions = categories.map((c) => ({
    value: c.id,
    label: `${c.code} - ${c.name}`,
  }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Ubah Informasi Produk' : 'Tambah Produk Baru'}
      description={
        isEditing
          ? 'Perbarui data barang, satuan konversi grosir, dan harga jual.'
          : 'Daftarkan barang sembako baru beserta satuan bertingkat (multi-satuan).'
      }
      size="2xl"
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* General Information Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-1 border-b border-surface-border">
            <PackagePlus className="w-4 h-4 text-brand-600" />
            <h4 className="text-xs font-bold text-ink uppercase tracking-wider">
              1. Informasi Dasar Produk
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <Input
                label="Barcode Produk (Identitas Utama)"
                placeholder="Scan dengan kamera atau ketik barcode kemasan..."
                required
                suffixElement={
                  <button
                    type="button"
                    onClick={() => setScanTarget('main')}
                    className="p-1 hover:bg-brand-50 text-brand-600 rounded transition-colors"
                    title="Scan Barcode via Kamera"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                }
                error={errors.barcode?.message}
                {...register('barcode')}
              />
            </div>

            <Select
              label="Kategori Sembako"
              required
              options={categoryOptions}
              error={errors.categoryId?.message}
              {...register('categoryId')}
            />

            <div className="sm:col-span-2">
              <Input
                label="Nama Produk"
                placeholder="Contoh: Beras Ramos Setra Rojo Lele 25kg"
                required
                error={errors.name?.message}
                {...register('name')}
              />
            </div>

            <Input
              label="Satuan Dasar (Terkecil)"
              placeholder="Contoh: PCS / KG / POUCH"
              required
              helperText={`Stok fisik dicatat dalam ${currentBaseUnit}`}
              error={errors.baseUnit?.message}
              {...register('baseUnit')}
              onChange={handleBaseUnitChange}
            />

            <Input
              label="Kode Barang (SKU)"
              placeholder="Otomatis mengikuti Barcode"
              helperText="Opsional: otomatis terisi sesuai barcode"
              error={errors.sku?.message}
              {...register('sku')}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Harga Beli (HPP Satuan Dasar)"
              type="number"
              min="0"
              prefixElement="Rp"
              placeholder="0"
              required
              onKeyDown={(e) => {
                if (e.key === '-' || e.key === 'e') e.preventDefault();
              }}
              error={errors.purchasePrice?.message}
              {...register('purchasePrice')}
            />

            <Input
              label="Batas Minimum Stok Alert"
              type="number"
              min="0"
              placeholder="10"
              suffixElement={currentBaseUnit}
              onKeyDown={(e) => {
                if (e.key === '-' || e.key === 'e') e.preventDefault();
              }}
              error={errors.minStock?.message}
              {...register('minStock')}
            />

            {!isEditing ? (
              <Input
                label="Stok Awal (Saat Ini)"
                type="number"
                min="0"
                placeholder="0"
                suffixElement={currentBaseUnit}
                helperText="Otomatis dicatat dalam audit trail"
                onKeyDown={(e) => {
                  if (e.key === '-' || e.key === 'e') e.preventDefault();
                }}
                error={errors.initialStock?.message}
                {...register('initialStock')}
              />
            ) : (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-ink uppercase tracking-wider">
                  Stok Saat Ini
                </label>
                <div className="h-[42px] px-3.5 py-2.5 bg-surface-subtle text-ink font-semibold text-sm rounded-md border border-surface-border flex items-center">
                  {formatNumber(initialData.currentStock)} {initialData.baseUnit}
                </div>
                <p className="text-[11px] text-ink-muted">
                  Gunakan tombol 'Sesuaikan Stok' untuk koreksi fisik.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Multi-Unit Pricing Section */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between pb-1 border-b border-surface-border">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-brand-600" />
              <h4 className="text-xs font-bold text-ink uppercase tracking-wider">
                2. Satuan Bertingkat & Harga Jual (Grosir / Eceran)
              </h4>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() =>
                append({
                  unitName: '',
                  conversionFactor: 10,
                  isBaseUnit: false,
                  price: 0,
                  wholesalePrice: 0,
                  barcode: '',
                })
              }
            >
              Tambah Satuan Grosir
            </Button>
          </div>

          <div className="bg-amber-50/70 border border-amber-200 rounded-md p-3 text-xs text-amber-900 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Aturan Multi-Satuan Grosir:</span> Satuan pertama selalu
              merupakan <strong>Satuan Dasar ({currentBaseUnit})</strong> dengan faktor 1. Anda dapat
              menambahkan satuan kemasan lain seperti <em>DUS, PACK, KARUNG, atau RENCENG</em> beserta
              faktor konversinya ke {currentBaseUnit}.
            </div>
          </div>

          <div className="space-y-3">
            {fields.map((field, index) => {
              const isBase = index === 0;
              return (
                <div
                  key={field.id}
                  className="p-3.5 bg-surface-muted border border-surface-border rounded-md space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
                      {isBase ? `Satuan Dasar (${currentBaseUnit})` : `Satuan Kemasan #${index + 1}`}
                    </span>
                    {!isBase && (
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="text-rose-600 hover:text-rose-800 p-1 rounded hover:bg-rose-50 transition-colors flex items-center gap-1 text-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    <Input
                      label="Nama Satuan"
                      placeholder={isBase ? currentBaseUnit : 'Contoh: DUS (24 PCS)'}
                      disabled={isBase}
                      error={errors.units?.[index]?.unitName?.message}
                      {...register(`units.${index}.unitName` as const)}
                    />

                    <Input
                      label="Faktor Konversi"
                      type="number"
                      min="1"
                      step="any"
                      disabled={isBase}
                      suffixElement={currentBaseUnit}
                      onKeyDown={(e) => {
                        if (e.key === '-' || e.key === 'e') e.preventDefault();
                      }}
                      error={errors.units?.[index]?.conversionFactor?.message}
                      {...register(`units.${index}.conversionFactor` as const)}
                    />

                    <Input
                      label="Harga Jual Eceran"
                      type="number"
                      min="0"
                      prefixElement="Rp"
                      placeholder="0"
                      onKeyDown={(e) => {
                        if (e.key === '-' || e.key === 'e') e.preventDefault();
                      }}
                      error={errors.units?.[index]?.price?.message}
                      {...register(`units.${index}.price` as const)}
                    />

                    <Input
                      label="Harga Grosir (Partai)"
                      type="number"
                      min="0"
                      prefixElement="Rp"
                      placeholder="0"
                      onKeyDown={(e) => {
                        if (e.key === '-' || e.key === 'e') e.preventDefault();
                      }}
                      error={errors.units?.[index]?.wholesalePrice?.message}
                      {...register(`units.${index}.wholesalePrice` as const)}
                    />

                    <Input
                      label="Barcode Kemasan"
                      placeholder="Opsional"
                      suffixElement={
                        <button
                          type="button"
                          onClick={() => setScanTarget(index)}
                          className="p-1 hover:bg-brand-50 text-brand-600 rounded transition-colors"
                          title="Scan Barcode Kemasan via Kamera"
                        >
                          <Camera className="w-4 h-4" />
                        </button>
                      }
                      error={errors.units?.[index]?.barcode?.message}
                      {...register(`units.${index}.barcode` as const)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="pt-4 border-t border-surface-border flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Batal
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            {isEditing ? 'Simpan Perubahan' : 'Daftarkan Produk'}
          </Button>
        </div>
      </form>

      <BarcodeScannerModal
        isOpen={scanTarget !== null}
        onClose={() => setScanTarget(null)}
        title={
          scanTarget === 'main'
            ? 'Scan Barcode Utama Produk'
            : `Scan Barcode Kemasan Satuan #${typeof scanTarget === 'number' ? scanTarget + 1 : ''}`
        }
        scannerId="product-form-barcode-scanner"
        onScan={(code) => {
          if (scanTarget === 'main') {
            setValue('barcode', code, { shouldValidate: true, shouldDirty: true });
            setValue('sku', code, { shouldDirty: true });
            success(`Barcode berhasil discan: ${code}`);
          } else if (typeof scanTarget === 'number') {
            setValue(`units.${scanTarget}.barcode`, code, { shouldValidate: true, shouldDirty: true });
            success(`Barcode satuan kemasan berhasil discan: ${code}`);
          }
          setScanTarget(null);
        }}
      />
    </Modal>
  );
};
