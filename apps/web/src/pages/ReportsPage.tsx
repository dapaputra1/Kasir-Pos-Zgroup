import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  DollarSign,
  Download,
  Calendar,
  Package,
  ArrowDownRight,
  ArrowUpRight,
  ShoppingBag,
  RefreshCw,
  Wallet,
  FileSpreadsheet,
  AlertCircle,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { api } from '../lib/api';
import { formatRupiah, formatNumber } from '../lib/utils';
import { ProfitLossData, TopProduct, CashflowData } from '../types/report';

export const ReportsPage: React.FC = () => {
  // Preset or custom dates
  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [startDate, setStartDate] = useState(thirtyDaysAgo);
  const [endDate, setEndDate] = useState(today);
  const [downloadingExport, setDownloadingExport] = useState<string | null>(null);

  // Set date preset helpers
  const applyPreset = (preset: 'today' | '7days' | '30days' | 'month' | 'all') => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === '7days') {
      const past7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      setStartDate(past7);
      setEndDate(todayStr);
    } else if (preset === '30days') {
      setStartDate(thirtyDaysAgo);
      setEndDate(todayStr);
    } else if (preset === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      setStartDate(firstDay);
      setEndDate(todayStr);
    } else if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    }
  };

  // Queries
  const {
    data: plData,
    isLoading: isLoadingPl,
    refetch: refetchPl,
  } = useQuery<ProfitLossData>({
    queryKey: ['report-profit-loss', startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      const res = await api.get(`/reports/profit-loss?${params.toString()}`);
      return res.data.data;
    },
  });

  const {
    data: topProducts,
    isLoading: isLoadingTop,
    refetch: refetchTop,
  } = useQuery<TopProduct[]>({
    queryKey: ['report-top-products', startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('limit', '10');
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      const res = await api.get(`/reports/top-products?${params.toString()}`);
      return res.data.data;
    },
  });

  const {
    data: cashflowData,
    isLoading: isLoadingCashflow,
    refetch: refetchCashflow,
  } = useQuery<CashflowData>({
    queryKey: ['report-cashflow', startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      const res = await api.get(`/reports/cashflow?${params.toString()}`);
      return res.data.data;
    },
  });

  const handleRefreshAll = () => {
    refetchPl();
    refetchTop();
    refetchCashflow();
  };

  const handleExportCsv = async (type: 'sales' | 'purchases' | 'inventory') => {
    try {
      setDownloadingExport(type);
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await api.get(`/reports/export/${type}?${params.toString()}`, {
        responseType: 'blob',
      });

      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `grosirpos-${type}-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Gagal export CSV:', err);
    } finally {
      setDownloadingExport(null);
    }
  };

  const isLoading = isLoadingPl || isLoadingTop || isLoadingCashflow;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
            <TrendingUp className="w-7 h-7 text-brand-600" />
            Laporan Finansial & Bisnis
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Analisis laba rugi, HPP grosir, arus kas kasir, serta ekspor pembukuan format CSV.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshAll}
            disabled={isLoading}
            className="flex items-center gap-2 text-ink-muted hover:text-ink"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Segarkan
          </Button>
        </div>
      </div>

      {/* Date Filter & Preset Controls */}
      <Card className="p-4 bg-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider mr-1">
              Periode:
            </span>
            <Button variant="outline" size="sm" onClick={() => applyPreset('today')}>
              Hari Ini
            </Button>
            <Button variant="outline" size="sm" onClick={() => applyPreset('7days')}>
              7 Hari
            </Button>
            <Button variant="outline" size="sm" onClick={() => applyPreset('30days')}>
              30 Hari
            </Button>
            <Button variant="outline" size="sm" onClick={() => applyPreset('month')}>
              Bulan Ini
            </Button>
            <Button variant="outline" size="sm" onClick={() => applyPreset('all')}>
              Semua Waktu
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-ink-muted shrink-0" />
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-38 text-xs h-9"
              />
              <span className="text-xs text-ink-muted">s/d</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-38 text-xs h-9"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* P&L Key Performance Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Omset / Pendapatan */}
        <Card className="p-5 border-l-4 border-l-brand-600 bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
              Omzet Penjualan
            </span>
            <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-ink">
              {formatRupiah(plData?.totalRevenue ?? 0)}
            </div>
            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-ink-muted">
              <span>{formatNumber(plData?.totalOrders ?? 0)} Transaksi</span>
              <span>•</span>
              <span className="text-amber-600">Diskon: {formatRupiah(plData?.totalDiscount ?? 0)}</span>
            </div>
          </div>
        </Card>

        {/* Total HPP (Beban Pokok Penjualan) */}
        <Card className="p-5 border-l-4 border-l-amber-500 bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
              Total HPP (COGS)
            </span>
            <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-ink">
              {formatRupiah(plData?.totalCogs ?? 0)}
            </div>
            <p className="text-xs text-ink-muted mt-1.5">
              Modal pokok persediaan terjual
            </p>
          </div>
        </Card>

        {/* Laba Kotor / Gross Profit */}
        <Card className="p-5 border-l-4 border-l-emerald-600 bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
              Laba Kotor (Gross Profit)
            </span>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-emerald-700">
              {formatRupiah(plData?.grossProfit ?? 0)}
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <Badge variant={Number(plData?.grossMargin ?? 0) >= 0 ? 'success' : 'danger'}>
                Margin: {Number(plData?.grossMargin ?? 0).toFixed(1)}%
              </Badge>
              <span className="text-xs text-ink-muted">(Omzet - HPP)</span>
            </div>
          </div>
        </Card>

        {/* Belanja Stok Supplier */}
        <Card className="p-5 border-l-4 border-l-blue-600 bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
              Belanja Stok (Supplier)
            </span>
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-ink">
              {formatRupiah(plData?.totalPurchases ?? 0)}
            </div>
            <p className="text-xs text-ink-muted mt-1.5">
              {formatNumber(plData?.totalPurchaseCount ?? 0)} Faktur Pembelian PO
            </p>
          </div>
        </Card>
      </div>

      {/* Cashflow & Export Center Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Arus Kas Riil (Cashflow) */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-ink-muted" />
                  Laporan Arus Kas Masuk & Keluar (Cashflow)
                </CardTitle>
                <p className="text-xs text-ink-muted mt-1">
                  Arus uang tunai riil yang diterima kasir dan dibayarkan ke supplier.
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Kas Masuk */}
                <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-100">
                  <div className="flex items-center gap-2 text-emerald-800 font-semibold text-xs uppercase tracking-wider">
                    <ArrowDownRight className="w-4 h-4 text-emerald-600" />
                    Total Kas Masuk
                  </div>
                  <div className="text-xl font-black text-emerald-900 mt-2">
                    {formatRupiah(cashflowData?.cashIn.total ?? 0)}
                  </div>
                  <div className="mt-3 space-y-1.5 text-xs text-emerald-700">
                    <div className="flex justify-between">
                      <span>Penjualan Lunas:</span>
                      <span className="font-semibold">{formatRupiah(cashflowData?.cashIn.salesPaid ?? 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pelunasan Bon:</span>
                      <span className="font-semibold">{formatRupiah(cashflowData?.cashIn.receivablesPaid ?? 0)}</span>
                    </div>
                  </div>
                </div>

                {/* Kas Keluar */}
                <div className="p-4 rounded-xl bg-rose-50/60 border border-rose-100">
                  <div className="flex items-center gap-2 text-rose-800 font-semibold text-xs uppercase tracking-wider">
                    <ArrowUpRight className="w-4 h-4 text-rose-600" />
                    Total Kas Keluar
                  </div>
                  <div className="text-xl font-black text-rose-900 mt-2">
                    {formatRupiah(cashflowData?.cashOut.total ?? 0)}
                  </div>
                  <div className="mt-3 space-y-1.5 text-xs text-rose-700">
                    <div className="flex justify-between">
                      <span>Pembelian Tunai:</span>
                      <span className="font-semibold">{formatRupiah(cashflowData?.cashOut.purchasesPaid ?? 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pelunasan Hutang:</span>
                      <span className="font-semibold">{formatRupiah(cashflowData?.cashOut.payablesPaid ?? 0)}</span>
                    </div>
                  </div>
                </div>

                {/* Net Cashflow */}
                <div className="p-4 rounded-xl bg-surface-muted/60 border border-surface-border flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-ink-muted font-semibold text-xs uppercase tracking-wider">
                      <Wallet className="w-4 h-4 text-ink-muted" />
                      Arus Kas Bersih (Net)
                    </div>
                    <div
                      className={`text-2xl font-black mt-2 ${
                        (cashflowData?.netCashflow ?? 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {formatRupiah(cashflowData?.netCashflow ?? 0)}
                    </div>
                  </div>
                  <p className="text-xs text-ink-muted mt-3">
                    {(cashflowData?.netCashflow ?? 0) >= 0
                      ? 'Posisi kas operasional surplus positif selama periode ini.'
                      : 'Posisi kas mengalami defisit pengeluaran dibandingkan penerimaan.'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CSV Export Center */}
        <div>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-ink-muted" />
                Ekspor Pembukuan CSV
              </CardTitle>
              <p className="text-xs text-ink-muted mt-1">
                Unduh file spreadsheet untuk laporan akuntansi toko.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 border border-surface-border rounded-lg bg-surface-muted/30">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-ink">Data Penjualan (Sales)</div>
                    <div className="text-[11px] text-ink-muted">Faktur POS, kasir, dan pembayaran</div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExportCsv('sales')}
                    disabled={downloadingExport === 'sales'}
                    className="flex items-center gap-1.5 text-xs text-brand-600 border-brand-200 hover:bg-brand-50"
                  >
                    <Download className={`w-3.5 h-3.5 ${downloadingExport === 'sales' ? 'animate-bounce' : ''}`} />
                    Unduh CSV
                  </Button>
                </div>
              </div>

              <div className="p-3 border border-surface-border rounded-lg bg-surface-muted/30">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-ink">Data Pembelian (Purchases)</div>
                    <div className="text-[11px] text-ink-muted">PO supplier & stok masuk</div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExportCsv('purchases')}
                    disabled={downloadingExport === 'purchases'}
                    className="flex items-center gap-1.5 text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
                  >
                    <Download className={`w-3.5 h-3.5 ${downloadingExport === 'purchases' ? 'animate-bounce' : ''}`} />
                    Unduh CSV
                  </Button>
                </div>
              </div>

              <div className="p-3 border border-surface-border rounded-lg bg-surface-muted/30">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-ink">Data Inventaris (Inventory)</div>
                    <div className="text-[11px] text-ink-muted">Stok real-time & valuasi aset barang</div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExportCsv('inventory')}
                    disabled={downloadingExport === 'inventory'}
                    className="flex items-center gap-1.5 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                  >
                    <Download className={`w-3.5 h-3.5 ${downloadingExport === 'inventory' ? 'animate-bounce' : ''}`} />
                    Unduh CSV
                  </Button>
                </div>
              </div>

              <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200/60 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Data CSV dapat dibuka langsung di Microsoft Excel, Google Sheets, atau aplikasi akuntansi Accurate/Zahir.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Top 10 Best Selling Products */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-ink-muted" />
              10 Produk Grosir Terlaris (Top Performers)
            </CardTitle>
            <p className="text-xs text-ink-muted mt-1">
              Peringkat barang sembako berdasarkan kuantitas unit terjual dan profitabilitas.
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-surface-border bg-surface-muted/40 text-[11px] font-semibold text-ink-muted uppercase tracking-wider">
                  <th className="py-3 px-4 w-12 text-center">No</th>
                  <th className="py-3 px-4">SKU & Nama Barang</th>
                  <th className="py-3 px-4 text-right">Qty Terjual</th>
                  <th className="py-3 px-4 text-right">Total Omzet</th>
                  <th className="py-3 px-4 text-right">HPP Modal</th>
                  <th className="py-3 px-4 text-right">Laba Kotor</th>
                  <th className="py-3 px-4 text-center">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border text-xs">
                {isLoadingTop ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-ink-muted">
                      Memuat data produk terlaris...
                    </td>
                  </tr>
                ) : !topProducts || topProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-ink-muted">
                      Belum ada data penjualan pada rentang tanggal yang dipilih.
                    </td>
                  </tr>
                ) : (
                  topProducts.map((p, index) => (
                    <tr key={p.productId} className="hover:bg-surface-muted/30 transition-colors">
                      <td className="py-3 px-4 text-center font-bold text-ink-muted">
                        {index === 0 ? (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-400 text-amber-950 font-black text-[11px]">
                            1
                          </span>
                        ) : index === 1 ? (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-300 text-slate-800 font-black text-[11px]">
                            2
                          </span>
                        ) : index === 2 ? (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-700 text-amber-100 font-black text-[11px]">
                            3
                          </span>
                        ) : (
                          index + 1
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-ink">{p.productName}</div>
                        <div className="text-[11px] text-ink-muted font-mono">{p.sku}</div>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-ink">
                        {formatNumber(p.totalQty)}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-ink">
                        {formatRupiah(p.totalRevenue)}
                      </td>
                      <td className="py-3 px-4 text-right text-ink-muted">
                        {formatRupiah(p.totalCogs)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-700">
                        {formatRupiah(p.profit)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant={p.margin >= 10 ? 'success' : 'outline'}>
                          {p.margin.toFixed(1)}%
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
export default ReportsPage;
