import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Boxes,
  History,
  Trash2,
  AlertCircle,
  Camera,
} from 'lucide-react';
import { api } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { useAuthStore } from '../stores/authStore';
import { ProductFormModal } from '../components/products/ProductFormModal';
import { StockAdjustModal } from '../components/products/StockAdjustModal';
import { StockHistoryModal } from '../components/products/StockHistoryModal';
import { BarcodeScannerModal } from '../components/pos/BarcodeScannerModal';
import { Product } from '../types/product';
import { Category } from '../types/category';
import { formatNumber, formatRupiah } from '../lib/utils';

export const ProductsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuthStore();
  const { success, error: toastError } = useToast();
  const queryClient = useQueryClient();

  // Search & Filter States
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [stockStatus, setStockStatus] = useState<string>(
    searchParams.get('status') || 'all'
  );
  const [page, setPage] = useState(1);

  // Modal States
  const [isFormModalOpen, setIsFormModalOpen] = useState(
    searchParams.get('action') === 'add'
  );
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const canManageProducts = user?.role === 'OWNER' || user?.role === 'ADMIN';
  const canAdjustStock =
    user?.role === 'OWNER' || user?.role === 'ADMIN' || user?.role === 'WAREHOUSE';

  // 1. Fetch Categories
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get('/categories');
      return res.data.data;
    },
  });

  // 2. Fetch Products
  const {
    data: productData,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ['products', search, selectedCategory, stockStatus, page],
    queryFn: async () => {
      const params: Record<string, any> = {
        page,
        limit: 15,
      };
      if (search.trim()) params.search = search.trim();
      if (selectedCategory) params.categoryId = selectedCategory;
      if (stockStatus !== 'all') params.stockStatus = stockStatus;

      const res = await api.get('/products', { params });
      return {
        items: res.data.data as Product[],
        meta: res.data.meta,
      };
    },
  });

  const products = productData?.items || [];
  const meta = productData?.meta || { total: 0, page: 1, limit: 15, totalPages: 1 };

  // 3. Create / Update Product Mutation
  const saveProductMutation = useMutation({
    mutationFn: async (formData: any) => {
      if (editingProduct) {
        const res = await api.put(`/products/${editingProduct.id}`, formData);
        return res.data.data;
      } else {
        const res = await api.post('/products', formData);
        return res.data.data;
      }
    },
    onSuccess: () => {
      success(
        editingProduct ? 'Produk berhasil diperbarui!' : 'Produk baru berhasil didaftarkan!'
      );
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      setIsFormModalOpen(false);
      setEditingProduct(null);
      // Clean up search param if present
      if (searchParams.get('action') === 'add') {
        searchParams.delete('action');
        setSearchParams(searchParams);
      }
    },
    onError: (err: any) => {
      toastError(err.message || 'Gagal menyimpan produk.');
    },
  });

  // 4. Adjust Stock Mutation
  const adjustStockMutation = useMutation({
    mutationFn: async ({
      productId,
      data,
    }: {
      productId: number;
      data: { type: string; quantity: number; note: string };
    }) => {
      const res = await api.post(`/products/${productId}/adjust-stock`, data);
      return res.data.data;
    },
    onSuccess: () => {
      success('Stok berhasil diperbarui dan mutasi audit tercatat!');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      setAdjustingProduct(null);
    },
    onError: (err: any) => {
      toastError(err.message || 'Gagal menyesuaikan stok.');
    },
  });

  // 5. Delete Product Mutation
  const deleteProductMutation = useMutation({
    mutationFn: async (productId: number) => {
      const res = await api.delete(`/products/${productId}`);
      return res.data;
    },
    onSuccess: () => {
      success('Produk berhasil dihapus/dinonaktifkan.');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      setDeletingProduct(null);
    },
    onError: (err: any) => {
      toastError(err.message || 'Gagal menghapus produk.');
    },
  });

  // View full history: fetch single product details with its movements
  const handleOpenHistory = async (prod: Product) => {
    try {
      const res = await api.get(`/products/${prod.id}`);
      setHistoryProduct(res.data.data);
    } catch (err: any) {
      toastError('Gagal memuat riwayat mutasi stok.');
    }
  };

  const categoryOptions = [
    { value: '', label: 'Semua Kategori' },
    ...categories.map((c) => ({ value: c.id, label: c.name })),
  ];

  return (
    <div className="space-y-5">
      {/* Action Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-ink flex items-center gap-2">
            <Package className="w-5 h-5 text-brand-600" />
            <span>Katalog Produk & Satuan Grosir</span>
          </h1>
          <p className="text-xs text-ink-muted mt-0.5">
            Kelola SKU, konversi satuan kemasan (Dus/Pack/Sak), dan pemantauan stok fisik.
          </p>
        </div>

        {canManageProducts && (
          <Button
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => {
              setEditingProduct(null);
              setIsFormModalOpen(true);
            }}
          >
            Tambah Produk Baru
          </Button>
        )}
      </div>

      {/* Search & Filters Toolbar */}
      <div className="bg-white p-4 rounded-lg border border-surface-border shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          {/* Search Bar */}
          <div className="lg:col-span-5">
            <Input
              placeholder="Cari berdasarkan nama produk, SKU, atau barcode..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              prefixElement={<Search className="w-4 h-4" />}
              suffixElement={
                <button
                  type="button"
                  onClick={() => setIsScanning(true)}
                  className="p-1 hover:bg-brand-50 text-brand-600 rounded transition-colors"
                  title="Scan Barcode untuk Cari Produk"
                >
                  <Camera className="w-4 h-4" />
                </button>
              }
            />
          </div>

          {/* Category Filter */}
          <div className="lg:col-span-4">
            <Select
              options={categoryOptions}
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setPage(1);
              }}
            />
          </div>

          {/* Quick Filter Status Buttons */}
          <div className="sm:col-span-2 lg:col-span-3 flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => {
                setStockStatus('all');
                setPage(1);
              }}
              className={`px-3 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap min-h-[40px] flex-1 text-center ${
                stockStatus === 'all'
                  ? 'bg-ink text-white'
                  : 'bg-surface-subtle text-ink hover:bg-gray-200'
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => {
                setStockStatus('low_stock');
                setPage(1);
              }}
              className={`px-3 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap min-h-[40px] flex-1 text-center ${
                stockStatus === 'low_stock'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              Menipis
            </button>
            <button
              onClick={() => {
                setStockStatus('out_of_stock');
                setPage(1);
              }}
              className={`px-3 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap min-h-[40px] flex-1 text-center ${
                stockStatus === 'out_of_stock'
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
              }`}
            >
              Habis
            </button>
          </div>
        </div>
      </div>

      {/* Product List Table Card */}
      <div className="bg-white rounded-lg border border-surface-border shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center text-ink-muted">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm font-medium">Memuat katalog produk...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <Package className="w-12 h-12 text-ink-subtle mx-auto mb-3 opacity-60" />
            <h3 className="text-base font-bold text-ink">Tidak ada produk ditemukan</h3>
            <p className="text-xs text-ink-muted max-w-sm mx-auto mt-1 mb-5">
              {search || selectedCategory || stockStatus !== 'all'
                ? 'Tidak ada produk yang cocok dengan kriteria pencarian atau filter yang dipilih.'
                : 'Mulai dengan mendaftarkan barang sembako pertama Anda ke dalam sistem.'}
            </p>
            {canManageProducts && (
              <Button
                variant="primary"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => {
                  setEditingProduct(null);
                  setIsFormModalOpen(true);
                }}
              >
                Tambah Produk Sekarang
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-muted border-b border-surface-border text-ink font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3.5">Barcode Produk</th>
                  <th className="px-4 py-3.5">Nama Produk</th>
                  <th className="px-4 py-3.5">Kategori</th>
                  <th className="px-4 py-3.5">Satuan & Harga Jual</th>
                  <th className="px-4 py-3.5 text-right">Stok Fisik</th>
                  <th className="px-4 py-3.5 text-right">HPP (Beli)</th>
                  <th className="px-4 py-3.5 text-center">Aksi Operasional</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border bg-white">
                {products.map((prod) => {
                  const stockNum = Number(prod.currentStock);
                  const minStockNum = Number(prod.minStock);
                  const isOutOfStock = stockNum <= 0;
                  const isLowStock = !isOutOfStock && stockNum <= minStockNum;

                  return (
                    <tr
                      key={prod.id}
                      className="hover:bg-surface-subtle/50 transition-colors group"
                    >
                      {/* Barcode Utama */}
                      <td className="px-4 py-3.5 align-top">
                        <div className="font-mono font-bold text-ink">
                          {prod.barcode || prod.sku}
                        </div>
                        {prod.barcode && prod.sku && prod.sku !== prod.barcode && (
                          <div className="text-[10px] text-ink-muted font-mono">
                            SKU: {prod.sku}
                          </div>
                        )}
                      </td>

                      {/* Product Name */}
                      <td className="px-4 py-3.5 align-top">
                        <div className="font-bold text-sm text-ink">{prod.name}</div>
                        {prod.description && (
                          <div className="text-[11px] text-ink-muted line-clamp-1">
                            {prod.description}
                          </div>
                        )}
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3.5 align-top">
                        <Badge variant="outline" className="text-[11px] font-medium">
                          {prod.category?.name || 'Umum'}
                        </Badge>
                      </td>

                      {/* Multi-Unit Pricing Badges */}
                      <td className="px-4 py-3.5 align-top">
                        <div className="flex flex-wrap gap-1.5 max-w-md">
                          {prod.units?.map((u) => (
                            <div
                              key={u.id || u.unitName}
                              className={`px-2 py-1 rounded text-[11px] border flex flex-col ${
                                u.isBaseUnit
                                  ? 'bg-brand-50/70 border-brand-200 text-brand-900'
                                  : 'bg-surface-subtle border-surface-border text-ink'
                              }`}
                            >
                              <div className="font-bold flex items-center justify-between gap-1.5">
                                <span>{u.unitName}</span>
                                {!u.isBaseUnit && (
                                  <span className="text-[10px] font-normal text-ink-muted">
                                    (x{formatNumber(u.conversionFactor)})
                                  </span>
                                )}
                              </div>
                              <div className="font-semibold text-brand-700">
                                {formatRupiah(u.price)}
                              </div>
                              {u.wholesalePrice && Number(u.wholesalePrice) > 0 && (
                                <div className="text-[10px] text-ink-muted">
                                  Grosir: {formatRupiah(u.wholesalePrice)}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* Current Stock Level */}
                      <td className="px-4 py-3.5 text-right align-top whitespace-nowrap">
                        <div
                          className={`font-black text-sm ${
                            isOutOfStock
                              ? 'text-rose-600'
                              : isLowStock
                              ? 'text-amber-600'
                              : 'text-ink'
                          }`}
                        >
                          {formatNumber(prod.currentStock)} {prod.baseUnit}
                        </div>
                        <div className="mt-0.5">
                          {isOutOfStock ? (
                            <Badge variant="danger">Habis</Badge>
                          ) : isLowStock ? (
                            <Badge variant="warning">Min: {formatNumber(prod.minStock)}</Badge>
                          ) : (
                            <Badge variant="success">Aman</Badge>
                          )}
                        </div>
                      </td>

                      {/* Purchase Price (HPP) */}
                      <td className="px-4 py-3.5 text-right align-top font-semibold text-ink-muted whitespace-nowrap">
                        {formatRupiah(prod.purchasePrice)}
                        <span className="text-[10px] block font-normal text-ink-subtle">
                          /{prod.baseUnit}
                        </span>
                      </td>

                      {/* Operational Actions */}
                      <td className="px-4 py-3.5 text-center align-top whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {canAdjustStock && (
                            <button
                              type="button"
                              onClick={() => setAdjustingProduct(prod)}
                              title="Koreksi / Tambah Stok"
                              className="p-1.5 text-ink-muted hover:text-brand-600 hover:bg-brand-50 rounded-md transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                            >
                              <Boxes className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleOpenHistory(prod)}
                            title="Riwayat Mutasi Stok (Audit Trail)"
                            className="p-1.5 text-ink-muted hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                          >
                            <History className="w-4 h-4" />
                          </button>

                          {canManageProducts && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingProduct(prod);
                                setIsFormModalOpen(true);
                              }}
                              title="Ubah Produk & Harga"
                              className="p-1.5 text-ink-muted hover:text-ink hover:bg-surface-subtle rounded-md transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}

                          {canManageProducts && (
                            <button
                              type="button"
                              onClick={() => setDeletingProduct(prod)}
                              title="Hapus / Nonaktifkan Produk"
                              className="p-1.5 text-ink-muted hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls Footer */}
        {meta.totalPages > 1 && (
          <div className="px-6 py-3.5 bg-surface-muted/60 border-t border-surface-border flex items-center justify-between text-xs text-ink-muted">
            <div>
              Menampilkan Halaman <strong>{meta.page}</strong> dari{' '}
              <strong>{meta.totalPages}</strong> (Total {meta.total} produk)
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || isFetching}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Sebelumnya
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= meta.totalPages || isFetching}
                onClick={() => setPage((p) => p + 1)}
              >
                Selanjutnya
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 1. Product Form Modal (Create / Edit) */}
      <ProductFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingProduct(null);
        }}
        categories={categories}
        initialData={editingProduct}
        isLoading={saveProductMutation.isPending}
        onSubmit={async (data) => {
          await saveProductMutation.mutateAsync(data);
        }}
      />

      {/* 2. Stock Adjustment Modal */}
      <StockAdjustModal
        isOpen={!!adjustingProduct}
        onClose={() => setAdjustingProduct(null)}
        product={adjustingProduct}
        isLoading={adjustStockMutation.isPending}
        onSubmit={async (data) => {
          if (adjustingProduct) {
            await adjustStockMutation.mutateAsync({
              productId: adjustingProduct.id,
              data,
            });
          }
        }}
      />

      {/* 3. Stock History Modal */}
      <StockHistoryModal
        isOpen={!!historyProduct}
        onClose={() => setHistoryProduct(null)}
        product={historyProduct}
      />

      {/* 4. Delete Confirmation Dialog */}
      <Modal
        isOpen={!!deletingProduct}
        onClose={() => setDeletingProduct(null)}
        title="Konfirmasi Penghapusan Produk"
        description="Tindakan ini akan menghapus atau menonaktifkan barang dari katalog aktif."
        size="sm"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeletingProduct(null)}
              disabled={deleteProductMutation.isPending}
            >
              Batal
            </Button>
            <Button
              variant="danger"
              size="sm"
              isLoading={deleteProductMutation.isPending}
              onClick={() => {
                if (deletingProduct) {
                  deleteProductMutation.mutate(deletingProduct.id);
                }
              }}
            >
              Ya, Hapus Produk
            </Button>
          </>
        }
      >
        <div className="flex items-start gap-3 text-xs text-ink">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            Apakah Anda yakin ingin menghapus produk{' '}
            <strong>{deletingProduct?.name}</strong> ({deletingProduct?.sku})?
            <p className="mt-1 text-ink-muted">
              Jika produk memiliki riwayat transaksi/mutasi, sistem akan secara otomatis
              menonaktifkan status produk tanpa menghapus jejak audit trail.
            </p>
          </div>
        </div>
      </Modal>

      {/* Barcode Scanner Modal for Quick Product Lookup */}
      <BarcodeScannerModal
        isOpen={isScanning}
        onClose={() => setIsScanning(false)}
        title="Scan Barcode Cari Produk / Cek Stok"
        scannerId="products-page-barcode-scanner"
        onScan={(code) => {
          setSearch(code);
          setPage(1);
          setIsScanning(false);
          success(`Pencarian barcode: ${code}`);
        }}
      />
    </div>
  );
};
