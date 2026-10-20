import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layers, Plus, Search, Edit2, Trash2 } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { api } from '../lib/api';
import { Category } from '../types/category';
import { CategoryFormModal } from '../components/categories/CategoryFormModal';

export const CategoriesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  const { data: categories = [], isLoading } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get('/categories');
      return res.data.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return api.delete(`/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err: any) => {
      alert(err?.response?.data?.message || 'Gagal menghapus kategori. Pastikan tidak ada produk terkait.');
    },
  });

  const handleDelete = (cat: Category) => {
    if (confirm(`Yakin ingin menghapus kategori "${cat.name}"?`)) {
      deleteMutation.mutate(cat.id);
    }
  };

  const filteredCategories = categories.filter((c) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return c.code.toLowerCase().includes(term) || c.name.toLowerCase().includes(term);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2.5">
            <Layers className="w-7 h-7 text-brand-600" />
            <span>Kategori Produk Sembako</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Pengelompokan barang dagangan untuk memudahkan pencarian katalog, kasir POS, dan pelaporan stok.
          </p>
        </div>

        <Button
          onClick={() => {
            setSelectedCategory(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 shadow-sm font-semibold"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Kategori</span>
        </Button>
      </div>

      <Card className="p-4 flex items-center justify-between">
        <div className="w-full sm:w-80">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kode atau nama kategori..."
            prefixElement={<Search className="w-4 h-4 text-gray-400" />}
          />
        </div>
        <span className="text-xs font-semibold text-gray-500">
          Total: {categories.length} Kategori
        </span>
      </Card>

      <Card className="overflow-hidden shadow-xs border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-100/80 text-gray-700 font-semibold border-b border-gray-200">
              <tr>
                <th className="py-3 px-4 w-32">Kode</th>
                <th className="py-3 px-4">Nama Kategori</th>
                <th className="py-3 px-4">Deskripsi / Keterangan</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400">
                    Memuat data kategori...
                  </td>
                </tr>
              ) : filteredCategories.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-400">
                    <Layers className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                    <p className="font-semibold text-gray-600">Tidak ada kategori ditemukan.</p>
                  </td>
                </tr>
              ) : (
                filteredCategories.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/70 transition">
                    <td className="py-3 px-4 font-mono font-bold text-gray-900">{c.code}</td>
                    <td className="py-3 px-4 font-semibold text-gray-900">{c.name}</td>
                    <td className="py-3 px-4 text-gray-600">{c.description || '-'}</td>
                    <td className="py-3 px-4 text-center">
                      <Badge variant={c.isActive ? 'success' : 'outline'}>
                        {c.isActive ? 'Aktif' : 'Non-aktif'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCategory(c);
                            setIsModalOpen(true);
                          }}
                          className="p-1.5 rounded-md text-gray-500 hover:text-brand-600 hover:bg-brand-50 transition"
                          title="Edit kategori"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(c)}
                          className="p-1.5 rounded-md text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="Hapus kategori"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <CategoryFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialData={selectedCategory}
      />
    </div>
  );
};
