import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Package,
  AlertTriangle,
  Boxes,
  ArrowUpRight,
  TrendingUp,
  RefreshCw,
  ShoppingCart,
  Warehouse,
  ClipboardList,
  Barcode,
  CreditCard,
  DollarSign,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { formatNumber, formatDate, getMovementDetails, formatRupiah } from '../lib/utils';
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
    <div className="space-y-5 pb-8">
      {/* 1. TOP BANNER: Welcome + Live Status */}
      <div className="bg-gradient-to-r from-[#0F2822] via-[#123E34] to-[#0A261F] text-white p-5 sm:p-6 rounded-2xl shadow-lg border border-emerald-900/40 relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Sistem Kasir & Inventori Siap Operasi
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Selamat Bertugas, <span className="text-emerald-400">{user?.name}</span>
            </h1>
            <p className="text-xs text-slate-300/80 mt-1 max-w-xl leading-relaxed">
              Pantau arus kas, stok fisik multi-satuan (Sak/Dus/Kg), dan hutang-piutang dagang toko secara real-time.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-white border border-white/10 transition-colors shadow-2xs backdrop-blur-sm"
              title="Perbarui Data"
            >
              <RefreshCw className="w-3.5 h-3.5 text-emerald-300" />
              <span>Segarkan</span>
            </button>

            <button
              onClick={() => navigate('/pos')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 hover:brightness-110 shadow-md shadow-emerald-950/50 transition-all transform active:scale-95"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Buka Kasir POS</span>
              <span className="font-mono text-[10px] bg-slate-950/20 text-slate-900 px-1.5 py-0.5 rounded font-black">
                F4
              </span>
            </button>
          </div>
        </div>

        {/* Quick Shortcut Pills */}
        <div className="relative z-10 mt-5 pt-4 border-t border-white/10 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400 font-semibold text-[11px]">Akses Cepat:</span>
          <button
            onClick={() => navigate('/suppliers')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition"
          >
            <Warehouse className="w-3.5 h-3.5 text-blue-400" />
            <span>Kulakan Restock</span>
          </button>
          <button
            onClick={() => navigate('/inventory')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition"
          >
            <ClipboardList className="w-3.5 h-3.5 text-amber-400" />
            <span>Stock Opname Fisik</span>
          </button>
          <button
            onClick={() => navigate('/barcode-print')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition"
          >
            <Barcode className="w-3.5 h-3.5 text-teal-400" />
            <span>Cetak Price Tag Rak</span>
          </button>
          <button
            onClick={() => navigate('/customers')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition"
          >
            <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
            <span>Piutang Bon Tempo</span>
          </button>
        </div>
      </div>

      {/* 2. CORE KPI METRICS: Real Business Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Omzet Hari Ini */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-emerald-300 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
              Penjualan Hari Ini
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-110 transition-transform shadow-2xs">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 tracking-tight tabular-nums">
            {isLoading ? '...' : formatRupiah(metrics?.todaySales || 0)}
          </div>
          <div className="mt-1 text-xs text-slate-500 flex items-center gap-1.5 font-medium">
            <span className="text-emerald-700 font-bold">{metrics?.todayOrdersCount || 0}</span>
            <span>transaksi struk selesai</span>
          </div>
        </div>

        {/* Card 2: Piutang Bon Customer */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-amber-300 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
              Piutang Bon Pelanggan
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center group-hover:scale-110 transition-transform shadow-2xs">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-amber-900 tracking-tight tabular-nums">
            {isLoading ? '...' : formatRupiah(metrics?.totalReceivables || 0)}
          </div>
          <div className="mt-1 text-xs text-amber-700 font-medium">
            Total saldo tempo aktif di toko
          </div>
        </div>

        {/* Card 3: Total Produk & Varian */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-blue-300 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
              Katalog Barang Aktif
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center group-hover:scale-110 transition-transform shadow-2xs">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 tracking-tight tabular-nums">
            {isLoading ? '...' : formatNumber(metrics?.activeProducts || 0)}
          </div>
          <div className="mt-1 text-xs text-slate-500 flex items-center gap-1 font-medium">
            <span className="text-blue-700 font-bold">{metrics?.totalCategories || 0}</span>
            <span>kategori sembako terdaftar</span>
          </div>
        </div>

        {/* Card 4: Peringatan Stok Menipis */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-rose-300 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
              Perlu Restock Segera
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center group-hover:scale-110 transition-transform shadow-2xs">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-rose-700 tracking-tight tabular-nums">
            {isLoading ? '...' : formatNumber(metrics?.lowStockCount || 0)}
          </div>
          <div className="mt-1 text-xs text-rose-600 font-semibold flex items-center gap-1">
            <span>Stok fisik mendekati ambang batas</span>
          </div>
        </div>
      </div>

      {/* 3. MAIN WORKSPACE: Critical Stock Table & Recent Movements */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column (2 Cols): Critical Stock Items */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 sm:p-5 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-slate-50/50 to-white">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>Peringatan Stok Kritis & Perlu Kulakan</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Barang dengan jumlah fisik di bawah ambang batas minimum toko.
              </p>
            </div>
            <button
              onClick={() => navigate('/products?status=low_stock')}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 hover:underline"
            >
              <span>Lihat Semua Produk</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 p-0">
            {criticalItems.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-xs space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <p className="font-extrabold text-sm text-slate-800">Semua Stok Aman & Melimpah</p>
                <p className="text-slate-500 max-w-sm mx-auto">
                  Tidak ada barang yang berada di bawah batas minimum stok saat ini.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-4 py-3">Nama Barang</th>
                      <th className="px-4 py-3 text-right">Stok Fisik</th>
                      <th className="px-4 py-3 text-right">Batas Min</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-center">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {criticalItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-bold text-slate-900">{item.name}</td>
                        <td className="px-4 py-3 text-right font-black text-rose-600 tabular-nums">
                          {formatNumber(item.currentStock)} {item.baseUnit}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-500 tabular-nums">
                          {formatNumber(item.minStock)} {item.baseUnit}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              item.status === 'out_of_stock'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {item.status === 'out_of_stock' ? 'Habis (0)' : 'Menipis'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {canManageProducts ? (
                            <button
                              onClick={() => {
                                api.get(`/products/${item.id}`).then((res) => {
                                  setSelectedProductForAdjust(res.data.data);
                                });
                              }}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 transition"
                            >
                              + Tambah Stok
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 Col): Recent Audit Stock Movements */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 sm:p-5 border-b border-slate-200/80 flex items-center justify-between bg-gradient-to-r from-slate-50/50 to-white">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <Boxes className="w-4 h-4 text-emerald-600" />
                <span>Log Mutasi Terkini</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Audit trail kartu stok real-time</p>
            </div>
            <button
              onClick={() => navigate('/inventory')}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800"
            >
              Semua
            </button>
          </div>

          <div className="p-4 flex-1 space-y-2.5 overflow-y-auto max-h-[480px]">
            {recentMovements.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">Belum ada riwayat mutasi stok.</p>
            ) : (
              recentMovements.map((m) => {
                const details = getMovementDetails(m.type);
                const isPositive = m.type === 'IN' || m.type === 'RETURN';
                return (
                  <div
                    key={m.id}
                    className="p-3 bg-slate-50/70 border border-slate-200/70 rounded-xl space-y-1.5 text-xs hover:border-slate-300 transition-colors shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900 truncate">
                        {m.product?.name}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          isPositive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                            : 'bg-rose-50 text-rose-700 border border-rose-200/60'
                        }`}
                      >
                        {details.label}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-600">
                      <span className="font-semibold">
                        Qty:{' '}
                        <span className={isPositive ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
                          {isPositive ? '+' : '-'}
                          {formatNumber(m.quantity)} {m.product?.baseUnit}
                        </span>
                      </span>
                      <span className="text-slate-500 font-mono text-[11px]">
                        Stok: {formatNumber(m.currentStock)} {m.product?.baseUnit}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-200/60">
                      <span>{m.user?.name || 'Sistem'}</span>
                      <span>{formatDate(m.createdAt)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
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
