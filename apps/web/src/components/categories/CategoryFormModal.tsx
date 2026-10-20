import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { api } from '../../lib/api';
import { Category } from '../../types/category';

const categorySchema = z.object({
  code: z.string().trim().min(2, 'Kode kategori minimal 2 karakter'),
  name: z.string().trim().min(2, 'Nama kategori minimal 2 karakter'),
  description: z.string().trim().optional(),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface CategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Category | null;
  onSuccess?: () => void;
}

export const CategoryFormModal: React.FC<CategoryFormModalProps> = ({
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
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      code: '',
      name: '',
      description: '',
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        code: initialData.code || '',
        name: initialData.name || '',
        description: initialData.description || '',
      });
    } else {
      reset({
        code: '',
        name: '',
        description: '',
      });
    }
  }, [initialData, reset, isOpen]);

  const mutation = useMutation({
    mutationFn: async (data: CategoryFormData) => {
      if (isEdit && initialData) {
        return api.put(`/categories/${initialData.id}`, data);
      }
      return api.post('/categories', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      if (onSuccess) onSuccess();
      onClose();
    },
  });

  const onSubmit = (data: CategoryFormData) => {
    mutation.mutate(data);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Ubah Kategori Sembako' : 'Tambah Kategori Sembako'}
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {mutation.isError && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
            {(mutation.error as any)?.response?.data?.message || 'Gagal menyimpan kategori.'}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
            Kode Kategori <span className="text-rose-500">*</span>
          </label>
          <Input
            {...register('code')}
            placeholder="Misal: CAT-BRS, CAT-MYK, CAT-ROK"
            error={errors.code?.message}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
            Nama Kategori <span className="text-rose-500">*</span>
          </label>
          <Input
            {...register('name')}
            placeholder="Misal: Beras & Biji-bijian, Rokok & Tembakau"
            error={errors.name?.message}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
            Deskripsi / Catatan
          </label>
          <textarea
            {...register('description')}
            rows={3}
            placeholder="Keterangan singkat kelompok barang..."
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Batal
          </Button>
          <Button type="submit" isLoading={mutation.isPending}>
            {isEdit ? 'Simpan Perubahan' : 'Tambahkan Kategori'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
