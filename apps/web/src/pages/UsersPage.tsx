import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Plus,
  Search,
  KeyRound,
  Edit2,
  Power,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../components/ui/Toast';
import { api } from '../lib/api';
import { UserStaff } from '../types/user';
import { UserFormModal } from '../components/users/UserFormModal';
import { ChangePasswordModal } from '../components/users/ChangePasswordModal';

export const UsersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserStaff | null>(null);

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordTargetUser, setPasswordTargetUser] = useState<UserStaff | null>(null);

  const { data: usersResponse, isLoading } = useQuery<{
    data: UserStaff[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }>({
    queryKey: ['users', search, roleFilter, page],
    queryFn: async () => {
      const res = await api.get('/users', {
        params: {
          search: search || undefined,
          role: roleFilter || undefined,
          page,
          limit: 15,
        },
      });
      return {
        data: res.data.data || [],
        pagination: res.data.meta || res.data.pagination || { total: 0, page: 1, limit: 15, totalPages: 1 },
      };
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      return api.put(`/users/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      success('Status aktif pengguna berhasil diubah!');
    },
    onError: (err: any) => {
      toastError(err?.response?.data?.message || 'Gagal mengubah status aktif pengguna.');
    },
  });

  const handleToggleActive = (user: UserStaff) => {
    const action = user.isActive ? 'menonaktifkan' : 'mengaktifkan kembali';
    if (confirm(`Yakin ingin ${action} akun "${user.name}"?`)) {
      toggleActiveMutation.mutate({ id: user.id, isActive: !user.isActive });
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'OWNER':
        return 'danger';
      case 'ADMIN':
        return 'warning';
      case 'CASHIER':
        return 'success';
      case 'WAREHOUSE':
        return 'info';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2.5">
            <Users className="w-7 h-7 text-brand-600" />
            <span>Manajemen Pengguna & Staf Toko</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Pengaturan akun Owner, Admin Operasional, Kasir Toko, dan Petugas Gudang dengan Role-Based Access Control.
          </p>
        </div>

        <Button
          onClick={() => {
            setSelectedUser(null);
            setIsFormModalOpen(true);
          }}
          className="flex items-center gap-2 shadow-sm font-semibold"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Pengguna Baru</span>
        </Button>
      </div>

      <Card className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-80">
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Cari nama, email, no HP..."
            prefixElement={<Search className="w-4 h-4 text-gray-400" />}
          />
        </div>

        <div className="w-full sm:w-48">
          <Select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            options={[
              { value: '', label: 'Semua Peran (Role)' },
              { value: 'OWNER', label: 'Owner (Pemilik)' },
              { value: 'ADMIN', label: 'Admin Toko' },
              { value: 'CASHIER', label: 'Kasir Toko' },
              { value: 'WAREHOUSE', label: 'Gudang' },
            ]}
          />
        </div>
      </Card>

      <Card className="overflow-hidden shadow-xs border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-100/80 text-gray-700 font-semibold border-b border-gray-200">
              <tr>
                <th className="py-3 px-4">Nama Karyawan</th>
                <th className="py-3 px-4">Email Login</th>
                <th className="py-3 px-4 text-center">Peran (Role)</th>
                <th className="py-3 px-4">No. WhatsApp / HP</th>
                <th className="py-3 px-4 text-center">Faktur Penjualan / Kulakan</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400">
                    Memuat data pengguna...
                  </td>
                </tr>
              ) : !usersResponse?.data || usersResponse.data.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    <Users className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                    <p className="font-semibold text-gray-600">Tidak ada pengguna ditemukan.</p>
                  </td>
                </tr>
              ) : (
                usersResponse.data.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/70 transition">
                    <td className="py-3 px-4 font-semibold text-gray-900 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs shrink-0">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <span>{u.name}</span>
                    </td>
                    <td className="py-3 px-4 text-gray-700 font-mono">{u.email}</td>
                    <td className="py-3 px-4 text-center">
                      <Badge variant={getRoleBadgeVariant(u.role)}>{u.role}</Badge>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{u.phone || '-'}</td>
                    <td className="py-3 px-4 text-center text-gray-700 font-medium">
                      {(u._count?.orders || 0) + (u._count?.purchases || 0)} transaksi
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge variant={u.isActive ? 'success' : 'outline'}>
                        {u.isActive ? 'Aktif' : 'Non-aktif'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedUser(u);
                            setIsFormModalOpen(true);
                          }}
                          className="p-1.5 rounded-md text-gray-500 hover:text-brand-600 hover:bg-brand-50 transition"
                          title="Ubah data staf"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPasswordTargetUser(u);
                            setIsPasswordModalOpen(true);
                          }}
                          className="p-1.5 rounded-md text-gray-500 hover:text-amber-600 hover:bg-amber-50 transition"
                          title="Reset password"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleActive(u)}
                          className={`p-1.5 rounded-md transition ${
                            u.isActive
                              ? 'text-gray-400 hover:text-rose-600 hover:bg-rose-50'
                              : 'text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50'
                          }`}
                          title={u.isActive ? 'Nonaktifkan akun' : 'Aktifkan akun'}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {usersResponse?.pagination && usersResponse.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
            <p className="text-xs text-gray-500">
              Menampilkan {usersResponse.data.length} dari {usersResponse.pagination.total} pengguna (Halaman {usersResponse.pagination.page} dari {usersResponse.pagination.totalPages})
            </p>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Sebelumnya
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= usersResponse.pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Selanjutnya
              </Button>
            </div>
          </div>
        )}
      </Card>

      <UserFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        initialData={selectedUser}
      />

      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        user={passwordTargetUser}
      />
    </div>
  );
};
