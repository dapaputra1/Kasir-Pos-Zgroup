import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Package,
  Layers,
  AlertTriangle,
  Boxes,
  Plus,
  ArrowUpRight,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';
import { api } from '../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useAuthStore } from '../stores/authStore';
import { formatNumber, formatDate, getMovementDetails } from '../lib/utils';
import { DashboardSummary } from '../types/dashboard';
import { Product } from '../types/product';
import { StockAdjustModal } from '../components/products/StockAdjustModal';
import { useToast } from '../components/ui/Toast';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { success, error: toastError } = useToast();
  const queryClient = useQueryClient();

  const [selectedProductForAdjust, setSelectedProductForAdjust] = useState<Product | null>(null);

  // Fetch dashboard summary
  const { data: summary, isLoading, refetch } = useQuery<DashboardSummary>({
    queryKey: ['dashboard-summary'],
    queryFn: async () => {
      const res = await api.get('/dashboard/summary');
      return res.data.data;
    },
  });

  // Stock adjustment mutation
  const adjustMutation = useMutation({
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
      success('Stok berhasil diperbarui dan mutasi tercatat!');
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setSelectedProductForAdjust(null);
    },
    onError: (err: any) => {
      toastError(err.message || 'Gagal menyesuaikan stok.');
    },
  });

  const canManageProducts = user?.role === 'OWNER' || user?.role === 'ADMIN';

  const metrics = summary?.metrics;
  const criticalItems = summary?.criticalStockItems || [];
  const recentMovements = summary?.recentMovements || [];

  return (
    <div className="space-y-6">
      {/* Top Welcome Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-lg border border-surface-border shadow-xs">
        <div>
          <h1 className="text-xl font-black text-ink">
            Selamat Datang, <span className="text-brand-600">{user?.name}</span>
          </h1>
          <p className="text-xs text-ink-muted mt-0.5">
            Berikut ringkasan status operasional dan inventori sembako hari ini.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Segarkan
          </Button>

          {canManageProducts && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/products?action=add')}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Tambah Produk Baru
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Products */}
        <Card className="hover:border-brand-300 transition-colors">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-ink-muted uppercase tracking-wider">
                Total Produk
              </span>
              <div className="w-8 h-8 rounded-md bg-brand-50 text-brand-700 flex items-center justify-center">
                <Package className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-black text-ink">
              {isLoading ? '...' : formatNumber(metrics?.totalProducts || 0)}
            </div>
            <div className="mt-1 text-xs text-ink-muted flex items-center gap-1">
              <span className="text-brand-600 font-semibold">{metrics?.activeProducts || 0}</span>{' '}
              produk berstatus aktif
            </div>
          </CardContent>
        </Card>

        {/* Categories */}
        <Card className="hover:border-blue-300 transition-colors">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-ink-muted uppercase tracking-wider">
                Kategori Sembako
              </span>
              <div className="w-8 h-8 rounded-md bg-blue-50 text-blue-700 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-black text-ink">
              {isLoading ? '...' : formatNumber(metrics?.totalCategories || 0)}
            </div>
            <div className="mt-1 text-xs text-ink-muted">Beras, Minyak, Gula, Mie, dll.</div>
          </CardContent>
        </Card>

        {/* Low Stock Warning */}
        <Card className="hover:border-amber-300 transition-colors">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                Stok Menipis
              </span>
              <div className="w-8 h-8 rounded-md bg-amber-50 text-amber-700 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-black text-amber-600">
              {isLoading ? '...' : formatNumber(metrics?.lowStockCount || 0)}
            </div>
            <div className="mt-1 text-xs text-amber-800 font-medium">Perlu kulakan / restock segera</div>
          </CardContent>
        </Card>

        {/* Out of Stock Alert */}
        <Card className="hover:border-rose-300 transition-colors">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">
                Stok Habis
              </span>
              <div className="w-8 h-8 rounded-md bg-rose-50 text-rose-700 flex items-center justify-center">
                <Boxes className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-black text-rose-600">
              {isLoading ? '...' : formatNumber(metrics?.outOfStockCount || 0)}
            </div>
            <div className="mt-1 text-xs text-rose-800 font-medium">Barang kosong di gudang</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Critical Stock Items & Recent Movements */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Critical Stock Alert Table (2 cols on lg) */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Peringatan Stok Kritis & Perlu Kulakan</span>
              </CardTitle>
              <p className="text-xs text-ink-muted mt-0.5">
                Barang yang jumlah fisiknya berada di bawah batas minimum stok yang telah ditentukan.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/products?status=low_stock')}
              rightIcon={<ArrowUpRight className="w-3.5 h-3.5" />}
            >
              Lihat Semua
            </Button>
          </CardHeader>

          <CardContent className="p-0">
            {criticalItems.length === 0 ? (
              <div className="p-8 text-center text-ink-muted text-xs">
                <TrendingUp className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                <p className="font-semibold text-emerald-800">Semua stok berada dalam kondisi aman!</p>
                <p className="mt-0.5">Tidak ada barang yang menipis di bawah batas minimum saat ini.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-muted border-b border-surface-border text-ink font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Nama Produk</th>
                      <th className="px-4 py-3 text-right">Stok Saat Ini</th>
                      <th className="px-4 py-3 text-right">Batas Min</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-center">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border bg-white">
                    {criticalItems.map((item) => (
                      <tr key={item.id} className="hover:bg-surface-subtle/50 transition-colors">
                        <td className="px-4 py-3 font-semibold text-ink">{item.name}</td>
                        <td className="px-4 py-3 text-right font-black text-rose-600">
                          {formatNumber(item.currentStock)} {item.baseUnit}
                        </td>
                        <td className="px-4 py-3 text-right text-ink-muted">
                          {formatNumber(item.minStock)} {item.baseUnit}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={item.status === 'out_of_stock' ? 'danger' : 'warning'}>
                            {item.status === 'out_of_stock' ? 'Habis (0)' : 'Menipis'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              // Fetch full product for stock adjustment modal
                              api.get(`/products/${item.id}`).then((res) => {
                                setSelectedProductForAdjust(res.data.data);
                              });
                            }}
                          >
                            + Tambah Stok
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Audit Stock Movements (1 col on lg) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Boxes className="w-4 h-4 text-brand-600" />
              <span>Log Mutasi Stok Terakhir</span>
            </CardTitle>
            <p className="text-xs text-ink-muted mt-0.5">Audit trail perubahan inventori real-time</p>
          </CardHeader>

          <CardContent className="p-4 space-y-3">
            {recentMovements.length === 0 ? (
              <p className="text-xs text-ink-muted text-center py-6">Belum ada riwayat mutasi stok.</p>
            ) : (
              recentMovements.map((m) => {
                const details = getMovementDetails(m.type);
                const isPositive = m.type === 'IN' || m.type === 'RETURN';
                return (
                  <div
                    key={m.id}
                    className="p-3 bg-surface-muted border border-surface-border rounded-lg space-y-1.5 text-xs hover:border-surface-subtle transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-ink truncate max-w-[170px]">
                        {m.product?.name}
                      </span>
                      <Badge className={details.color}>{details.label}</Badge>
                    </div>

                    <div className="flex items-center justify-between text-ink-muted">
                      <span>
                        Perubahan:{' '}
                        <strong className={isPositive ? 'text-emerald-700' : 'text-rose-700'}>
                          {isPositive ? '+' : '-'}
                          {formatNumber(m.quantity)} {m.product?.baseUnit}
                        </strong>
                      </span>
                      <span className="font-medium">
                        Stok: {formatNumber(m.currentStock)} {m.product?.baseUnit}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-ink-subtle pt-1 border-t border-surface-border/60">
                      <span>Oleh: {m.user?.name || 'Sistem'}</span>
                      <span>{formatDate(m.createdAt)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stock Adjustment Modal */}
      <StockAdjustModal
        isOpen={!!selectedProductForAdjust}
        onClose={() => setSelectedProductForAdjust(null)}
        product={selectedProductForAdjust}
        isLoading={adjustMutation.isPending}
        onSubmit={async (data) => {
          if (selectedProductForAdjust) {
            await adjustMutation.mutateAsync({
              productId: selectedProductForAdjust.id,
              data,
            });
          }
        }}
      />
    </div>
  );
};
