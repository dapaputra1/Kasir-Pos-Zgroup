import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { api } from '../../lib/api';
import { Supplier } from '../../types/supplier';

const supplierSchema = z.object({
  code: z.string().trim().optional(),
  name: z.string().trim().min(2, 'Nama supplier minimal 2 karakter'),
  contactPerson: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  address: z.string().trim().optional(),
});

type SupplierFormData = z.infer<typeof supplierSchema>;

interface SupplierFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Supplier | null;
  onSuccess?: () => void;
}

export const SupplierFormModal: React.FC<SupplierFormModalProps> = ({
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
  } = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      code: '',
      name: '',
      contactPerson: '',
      phone: '',
      address: '',
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        code: initialData.code || '',
        name: initialData.name || '',
        contactPerson: initialData.contactPerson || '',
        phone: initialData.phone || '',
        address: initialData.address || '',
      });
    } else {
      reset({
        code: '',
        name: '',
        contactPerson: '',
        phone: '',
        address: '',
      });
    }
  }, [initialData, reset, isOpen]);

  const mutation = useMutation({
    mutationFn: async (data: SupplierFormData) => {
      if (isEdit && initialData) {
        return api.put(`/suppliers/${initialData.id}`, data);
      }
      return api.post('/suppliers', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['purchases-summary'] });
      if (onSuccess) onSuccess();
      onClose();
    },
  });

  const onSubmit = (data: SupplierFormData) => {
    mutation.mutate(data);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Ubah Data Supplier' : 'Tambah Supplier Baru'}
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {mutation.isError && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
            {(mutation.error as any)?.response?.data?.message || 'Gagal menyimpan data supplier.'}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
              Kode Supplier
            </label>
            <Input
              {...register('code')}
              placeholder="Otomatis jika dikosongkan (SUPP-001)"
              error={errors.code?.message}
            />
            <p className="text-[11px] text-gray-500 mt-1">Kosongkan untuk penomoran otomatis.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
              Nama Supplier / PT <span className="text-rose-500">*</span>
            </label>
            <Input
              {...register('name')}
              placeholder="Misal: PT Indofood CBP Tbk"
              error={errors.name?.message}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
              Kontak Person / Sales
            </label>
            <Input
              {...register('contactPerson')}
              placeholder="Misal: Bapak Hendra (Sales)"
              error={errors.contactPerson?.message}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
              Nomor Telepon / WhatsApp
            </label>
            <Input
              {...register('phone')}
              placeholder="Misal: 0812-3456-7890"
              error={errors.phone?.message}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
            Alamat Kantor / Gudang
          </label>
          <textarea
            {...register('address')}
            rows={3}
            placeholder="Alamat lengkap supplier..."
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Batal
          </Button>
          <Button type="submit" isLoading={mutation.isPending}>
            {isEdit ? 'Simpan Perubahan' : 'Tambahkan Supplier'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
