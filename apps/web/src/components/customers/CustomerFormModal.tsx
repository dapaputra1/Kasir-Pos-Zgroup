import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { api } from '../../lib/api';
import { Customer } from '../../types/customer';

const customerSchema = z.object({
  code: z.string().trim().optional(),
  name: z.string().trim().min(2, 'Nama pelanggan minimal 2 karakter'),
  phone: z.string().trim().optional(),
  address: z.string().trim().optional(),
  tier: z.enum(['REGULAR', 'GROSIR', 'VIP']),
  creditLimit: z.coerce.number().min(0, 'Plafon tidak boleh negatif').default(0),
});

type CustomerFormData = z.infer<typeof customerSchema>;

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Customer | null;
  onSuccess?: () => void;
}

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
  isOpen,
  onClose,
  initialData,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const isEdit = !!initialData;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      code: '',
      name: '',
      phone: '',
      address: '',
      tier: 'REGULAR',
      creditLimit: 0,
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        code: initialData.code || '',
        name: initialData.name || '',
        phone: initialData.phone || '',
        address: initialData.address || '',
        tier: initialData.tier || 'REGULAR',
        creditLimit: Number(initialData.creditLimit || 0),
      });
    } else {
      reset({
        code: '',
        name: '',
        phone: '',
        address: '',
        tier: 'REGULAR',
        creditLimit: 0,
      });
    }
  }, [initialData, reset, isOpen]);

  const mutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      if (isEdit && initialData) {
        return api.put(`/customers/${initialData.id}`, data);
      }
      return api.post('/customers', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['receivables-summary'] });
      if (onSuccess) onSuccess();
      onClose();
    },
  });

  const onSubmit = (data: CustomerFormData) => {
    mutation.mutate(data);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Ubah Data Pelanggan' : 'Tambah Pelanggan Baru'}
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {mutation.isError && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
            {(mutation.error as any)?.response?.data?.message || 'Gagal menyimpan data pelanggan.'}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
              Kode Pelanggan
            </label>
            <Input
              {...register('code')}
              placeholder="Otomatis jika kosong (CUST-001)"
              error={errors.code?.message}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
              Nama Pelanggan / Warung <span className="text-rose-500">*</span>
            </label>
            <Input
              {...register('name')}
              placeholder="Misal: Toko Berkah Ibu Ani"
              error={errors.name?.message}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
              Nomor WhatsApp / Telepon
            </label>
            <Input
              {...register('phone')}
              placeholder="Misal: 0812-3456-7890"
              error={errors.phone?.message}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
              Kategori Pelanggan (Tier)
            </label>
            <Select
              {...register('tier')}
              options={[
                { value: 'REGULAR', label: 'Eceran (REGULAR)' },
                { value: 'GROSIR', label: 'Langganan Toko (GROSIR)' },
                { value: 'VIP', label: 'Agen Besar (VIP)' },
              ]}
              error={errors.tier?.message}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
            Plafon Batas Piutang Bon Tempo (Rp)
          </label>
          <Input
            type="number"
            min="0"
            step="100000"
            {...register('creditLimit')}
            placeholder="0 = Tanpa limit / Cash only"
            error={errors.creditLimit?.message}
          />
          <p className="text-[11px] text-gray-400 mt-1">
            Maksimal total bon/piutang yang diizinkan untuk pelanggan ini. (0 = Tanpa batas kredit).
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
            Alamat Lengkap Toko / Rumah
          </label>
          <textarea
            {...register('address')}
            rows={2}
            placeholder="Alamat pelanggan..."
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Batal
          </Button>
          <Button type="submit" isLoading={mutation.isPending}>
            {isEdit ? 'Simpan Perubahan' : 'Tambahkan Pelanggan'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
