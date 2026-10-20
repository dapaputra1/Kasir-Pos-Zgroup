import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { useToast } from '../ui/Toast';
import { api } from '../../lib/api';
import { UserStaff } from '../../types/user';

const userCreateSchema = z.object({
  name: z.string().trim().min(2, 'Nama minimal 2 karakter'),
  email: z.string().trim().email('Format email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  phone: z.string().trim().optional(),
  role: z.enum(['OWNER', 'ADMIN', 'CASHIER', 'WAREHOUSE']),
});

const userEditSchema = z.object({
  name: z.string().trim().min(2, 'Nama minimal 2 karakter'),
  email: z.string().trim().email('Format email tidak valid'),
  phone: z.string().trim().optional(),
  role: z.enum(['OWNER', 'ADMIN', 'CASHIER', 'WAREHOUSE']),
  password: z.string().optional(),
});

type UserFormData = z.infer<typeof userCreateSchema>;

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: UserStaff | null;
  onSuccess?: () => void;
}

export const UserFormModal: React.FC<UserFormModalProps> = ({
  isOpen,
  onClose,
  initialData,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();
  const isEdit = !!initialData;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(isEdit ? userEditSchema : userCreateSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      phone: '',
      role: 'CASHIER',
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        reset({
          name: initialData.name,
          email: initialData.email,
          phone: initialData.phone || '',
          role: initialData.role,
          password: '',
        });
      } else {
        reset({
          name: '',
          email: '',
          password: '',
          phone: '',
          role: 'CASHIER',
        });
      }
    }
  }, [initialData, reset, isOpen]);

  const mutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      if (isEdit && initialData) {
        return api.put(`/users/${initialData.id}`, {
          name: data.name,
          email: data.email,
          phone: data.phone?.trim() ? data.phone.trim() : null,
          role: data.role,
        });
      }
      return api.post('/users', {
        ...data,
        phone: data.phone?.trim() ? data.phone.trim() : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      success(isEdit ? 'Data staf berhasil diperbarui!' : 'Pengguna baru berhasil ditambahkan!');
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.response?.data?.error?.message || 'Gagal menyimpan data pengguna.';
      toastError(msg);
    },
  });

  const onSubmit = (data: UserFormData) => {
    mutation.mutate(data);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Ubah Data Karyawan' : 'Tambah Staf / Pengguna Baru'}
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {mutation.isError && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
            {(mutation.error as any)?.response?.data?.message || 'Gagal menyimpan data staf.'}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
            Nama Lengkap <span className="text-rose-500">*</span>
          </label>
          <Input
            {...register('name')}
            placeholder="Misal: Andi Wijaya"
            error={errors.name?.message}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
              Alamat Email (Login) <span className="text-rose-500">*</span>
            </label>
            <Input
              type="email"
              {...register('email')}
              placeholder="kasir@toko.com"
              error={errors.email?.message}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
              Nomor WhatsApp / HP
            </label>
            <Input
              {...register('phone')}
              placeholder="0812-3456-7890"
              error={errors.phone?.message}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
            Peran / Hak Akses (Role) <span className="text-rose-500">*</span>
          </label>
          <Select
            {...register('role')}
            options={[
              { value: 'CASHIER', label: 'Kasir Toko (Penjualan POS & Riwayat)' },
              { value: 'WAREHOUSE', label: 'Gudang (Restock Kulakan & Opname Fisik)' },
              { value: 'ADMIN', label: 'Admin Operasional (Produk, Supplier, Laporan)' },
              { value: 'OWNER', label: 'Pemilik Toko (Owner - Seluruh Akses)' },
            ]}
            error={errors.role?.message}
          />
        </div>

        {!isEdit && (
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
              Password Awal <span className="text-rose-500">*</span>
            </label>
            <Input
              type="password"
              {...register('password')}
              placeholder="Minimal 6 karakter"
              error={errors.password?.message}
            />
          </div>
        )}

        <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Batal
          </Button>
          <Button type="submit" isLoading={mutation.isPending}>
            {isEdit ? 'Simpan Perubahan' : 'Tambahkan Karyawan'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
