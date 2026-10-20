import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  RefreshCw,
  ShoppingCart,
  Warehouse,
  ClipboardList,
  Barcode,
  CreditCard,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Package,
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

  const { data: summary, isLoading, refetch } = useQuery<DashboardSummary>({
    queryKey: ['dashboard-summary'],
    queryFn: async () => {
      const res = await api.get('/dashboard/summary');
      return res.data.data;
    },
    refetchInterval: 30000,
  });

  const adjustStockMutation = useMutation({
    mutationFn: async (data: { productId: number; type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'RETURN'; quantity: number; note?: string }) => {
      const res = await api.post(`/inventory/adjust`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      success('Penyesuaian stok berhasil disimpan.');
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
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Ringkasan Bisnis
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pantauan operasional kasir, perputaran stok barang, dan piutang toko grosir secara real-time.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Segarkan</span>
          </button>

          <button
            onClick={() => navigate('/pos')}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white transition-colors shadow-xs"
          >
            <ShoppingCart className="w-3.5 h-3.5 text-emerald-400" />
            <span>Buka Kasir POS</span>
            <span className="font-mono text-[10px] bg-slate-800 text-slate-300 px-1 py-0.5 rounded border border-slate-700">
              F4
            </span>
          </button>
        </div>
      </div>

      {/* 2. KPI METRICS (Clean, High-density Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Omzet Hari Ini */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Penjualan Hari Ini</span>
            <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
              Live
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-2 tracking-tight">
            {formatRupiah(metrics?.todaySales ?? 0)}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            <span>{formatNumber(metrics?.todayOrdersCount ?? 0)} transaksi selesai</span>
          </div>
        </div>

        {/* Card 2: Total Piutang Bon */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Total Piutang Bon</span>
            <CreditCard className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-2 tracking-tight">
            {formatRupiah(metrics?.totalReceivables ?? 0)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Tagihan tempo pelanggan aktif
          </div>
        </div>

        {/* Card 3: Katalog Produk */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Katalog Master Produk</span>
            <Package className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-2 tracking-tight">
            {formatNumber(metrics?.totalProducts ?? 0)}{' '}
            <span className="text-sm font-normal text-slate-500">Item</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {formatNumber(metrics?.totalCategories ?? 0)} Kategori Sembako
          </div>
        </div>

        {/* Card 4: Stok Kritis */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Peringatan Stok Kritis</span>
            <AlertCircle
              className={`w-4 h-4 ${
                (metrics?.lowStockCount ?? 0) + (metrics?.outOfStockCount ?? 0) > 0
                  ? 'text-amber-500'
                  : 'text-slate-400'
              }`}
            />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-2 tracking-tight">
            {formatNumber((metrics?.lowStockCount ?? 0) + (metrics?.outOfStockCount ?? 0))}{' '}
            <span className="text-sm font-normal text-slate-500">SKU</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {metrics?.outOfStockCount ?? 0} Habis • {metrics?.lowStockCount ?? 0} Menipis
          </div>
        </div>
      </div>

      {/* 3. MAIN WORKSPACE (2-COLUMN ARCHITECTURE) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols): Tables */}
        <div className="lg:col-span-8 space-y-6">
          {/* Section A: Critical Stock Alert */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Status Stok Menipis & Habis
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Barang yang telah mencapai atau berada di bawah batas minimum gudang.
                </p>
              </div>

              <button
                onClick={() => navigate('/products?status=low_stock')}
                className="text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1"
              >
                <span>Lihat Semua</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {criticalItems.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-2">
                  <Package className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-xs font-medium text-slate-900">
                  Semua Stok Berada di Batas Aman
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Tidak ada komoditas sembako yang berstatus habis atau menipis saat ini.
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-4 py-2.5">Produk</th>
                      <th className="px-4 py-2.5 text-right">Sisa Stok</th>
                      <th className="px-4 py-2.5 text-right">Batas Min</th>
                      <th className="px-4 py-2.5 text-center">Status</th>
                      <th className="px-4 py-2.5 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {criticalItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/75 transition-colors">
                        <td className="px-4 py-2.5">
                          <div className="font-semibold text-slate-900">{item.name}</div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            ID #{item.id} • Satuan Dasar: {item.baseUnit}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono font-semibold text-slate-900">
                          {formatNumber(item.currentStock)} {item.baseUnit}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-slate-500">
                          {formatNumber(item.minStock)} {item.baseUnit}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span
                            className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded ${
                              item.status === 'out_of_stock'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-amber-50 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {item.status === 'out_of_stock' ? 'Habis (0)' : 'Menipis'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {canManageProducts ? (
                            <button
                              onClick={() => {
                                api.get(`/products/${item.id}`).then((res) => {
                                  setSelectedProductForAdjust(res.data.data);
                                });
                              }}
                              className="px-2.5 py-1 rounded text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 transition shadow-2xs"
                            >
                              Restock
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

          {/* Section B: Recent Stock Movements Ledger */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Log Audit Mutasi Stok Terakhir
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pencatatan pergerakan barang masuk, penjualan, dan penyesuaian opname.
                </p>
              </div>

              <button
                onClick={() => navigate('/inventory')}
                className="text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1"
              >
                <span>Buka Mutasi Lengkap</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-2.5">Waktu</th>
                    <th className="px-4 py-2.5">Produk Sembako</th>
                    <th className="px-4 py-2.5 text-center">Tipe</th>
                    <th className="px-4 py-2.5 text-right">Jumlah</th>
                    <th className="px-4 py-2.5">Keterangan / Ref</th>
                    <th className="px-4 py-2.5">Petugas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentMovements.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                        Belum ada mutasi stok tercatat dalam sistem.
                      </td>
                    </tr>
                  ) : (
                    recentMovements.slice(0, 7).map((mov) => {
                      const details = getMovementDetails(mov.type);
                      const isPositive = mov.type === 'IN';

                      return (
                        <tr key={mov.id} className="hover:bg-slate-50/75 transition-colors">
                          <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap text-[11px] font-mono">
                            {formatDate(mov.createdAt)}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="font-semibold text-slate-900">
                              {mov.product?.name || `Produk #${mov.productId}`}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono block">
                              {mov.product?.sku}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-center whitespace-nowrap">
                            <span
                              className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded ${
                                isPositive
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {details.label}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono font-semibold whitespace-nowrap">
                            <span className={isPositive ? 'text-emerald-700' : 'text-rose-700'}>
                              {isPositive ? '+' : '-'}
                              {formatNumber(mov.quantity)} {mov.product?.baseUnit || 'Satuan'}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-slate-600 max-w-xs truncate text-[11px]">
                            {mov.note || (mov.referenceType ? `Ref: ${mov.referenceType}` : '-')}
                          </td>
                          <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap text-[11px]">
                            {mov.user?.name || 'Sistem'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Operations & Shortcuts */}
        <div className="lg:col-span-4 space-y-6">
          {/* Quick Action Navigation */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Akses Operasional Cepat
            </h3>

            <div className="space-y-1.5">
              <button
                onClick={() => navigate('/pos')}
                className="w-full flex items-center justify-between p-2.5 rounded-md text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 border border-slate-200 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <ShoppingCart className="w-4 h-4 text-emerald-600" />
                  <span>Transaksi Kasir Baru</span>
                </div>
                <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1 py-0.5 rounded">
                  F4
                </span>
              </button>

              <button
                onClick={() => navigate('/suppliers')}
                className="w-full flex items-center justify-between p-2.5 rounded-md text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 border border-slate-200 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Warehouse className="w-4 h-4 text-blue-600" />
                  <span>Kulakan Restock Supplier</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                onClick={() => navigate('/inventory')}
                className="w-full flex items-center justify-between p-2.5 rounded-md text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 border border-slate-200 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <ClipboardList className="w-4 h-4 text-amber-600" />
                  <span>Stock Opname Fisik</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                onClick={() => navigate('/barcode-print')}
                className="w-full flex items-center justify-between p-2.5 rounded-md text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 border border-slate-200 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Barcode className="w-4 h-4 text-purple-600" />
                  <span>Cetak Price Tag Rak</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                onClick={() => navigate('/customers')}
                className="w-full flex items-center justify-between p-2.5 rounded-md text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 border border-slate-200 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <CreditCard className="w-4 h-4 text-teal-600" />
                  <span>Kelola Piutang Bon Tempo</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Financial Summary Card */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Ringkasan Neraca Dagang
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-slate-500">Piutang Bon Pelanggan</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatRupiah(metrics?.totalReceivables ?? 0)}
                </span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-slate-500">Hutang Pembelian Supplier</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatRupiah(metrics?.totalPayables ?? 0)}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-700 font-semibold">Selisih Piutang - Hutang</span>
                <span
                  className={`font-mono font-bold ${
                    Number(metrics?.totalReceivables ?? 0) - Number(metrics?.totalPayables ?? 0) >= 0
                      ? 'text-emerald-700'
                      : 'text-rose-700'
                  }`}
                >
                  {formatRupiah(
                    Number(metrics?.totalReceivables ?? 0) - Number(metrics?.totalPayables ?? 0)
                  )}
                </span>
              </div>

              <button
                onClick={() => navigate('/reports')}
                className="w-full mt-3 py-2 text-center text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-md border border-slate-200 transition-colors flex items-center justify-center gap-1.5"
              >
                <TrendingUp className="w-3.5 h-3.5 text-slate-500" />
                <span>Buka Laporan Laba Rugi</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stock Adjustment Modal */}
      {selectedProductForAdjust && (
        <StockAdjustModal
          product={selectedProductForAdjust}
          isOpen={Boolean(selectedProductForAdjust)}
          onClose={() => setSelectedProductForAdjust(null)}
          onSubmit={async (data) => {
            await adjustStockMutation.mutateAsync({
              productId: selectedProductForAdjust.id,
              ...data,
            });
          }}
          isLoading={adjustStockMutation.isPending}
        />
      )}
    </div>
  );
};
