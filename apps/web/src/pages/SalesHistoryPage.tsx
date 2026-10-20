import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  History,
  Search,
  Printer,
  Calendar,
  DollarSign,
  Receipt,
} from 'lucide-react';
import { api } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { Card, CardContent } from '../components/ui/Card';
import { ReceiptModal } from '../components/pos/ReceiptModal';
import { Order } from '../types/pos';
import { formatNumber, formatRupiah, formatDate } from '../lib/utils';

export const SalesHistoryPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [page, setPage] = useState(1);

  // Struk modal
  const [selectedOrderForReceipt, setSelectedOrderForReceipt] = useState<Order | null>(null);

  // Fetch Orders
  const { data: salesData, isLoading, refetch } = useQuery({
    queryKey: ['sales-orders', search, paymentMethod, startDate, endDate, page],
    queryFn: async () => {
      const params: any = { page, limit: 15 };
      if (search.trim()) params.search = search.trim();
      if (paymentMethod) params.paymentMethod = paymentMethod;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await api.get('/pos/orders', { params });
      return {
        items: res.data.data as Order[],
        meta: res.data.meta,
        summary: res.data.meta?.summary || { totalRevenue: 0, totalOrders: 0 },
      };
    },
  });

  const orders = salesData?.items || [];
  const meta = salesData?.meta || { total: 0, page: 1, limit: 15, totalPages: 1 };
  const summary = salesData?.summary || { totalRevenue: 0, totalOrders: 0 };

  const handleOpenReceipt = async (orderId: number) => {
    try {
      const res = await api.get(`/pos/orders/${orderId}`);
      setSelectedOrderForReceipt(res.data.data);
    } catch {
      // Fallback
    }
  };

  const paymentOptions = [
    { value: '', label: 'Semua Metode Pembayaran' },
    { value: 'CASH', label: 'Tunai (CASH)' },
    { value: 'QRIS', label: 'QRIS' },
    { value: 'TRANSFER', label: 'Transfer Bank' },
    { value: 'TEMPO', label: 'Tempo / Hutang Dagang' },
  ];

  return (
    <div className="space-y-5">
      {/* Page Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-ink flex items-center gap-2">
            <History className="w-5 h-5 text-brand-600" />
            <span>Riwayat Transaksi Penjualan</span>
          </h1>
          <p className="text-xs text-ink-muted mt-0.5">
            Daftar lengkap faktur struk penjualan, audit metode pembayaran, dan cetak ulang nota kasir.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          leftIcon={<Calendar className="w-3.5 h-3.5" />}
        >
          Perbarui Data
        </Button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border-brand-200 bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-ink-muted uppercase tracking-wider">
                Total Omset Penjualan
              </span>
              <div className="text-2xl font-black text-brand-600 mt-1">
                {formatRupiah(summary.totalRevenue)}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-ink-muted uppercase tracking-wider">
                Total Transaksi Faktur
              </span>
              <div className="text-2xl font-black text-ink mt-1">
                {formatNumber(summary.totalOrders)} Transaksi
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-lg border border-surface-border shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Input
            placeholder="Cari no. faktur / pelanggan..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            prefixElement={<Search className="w-4 h-4 text-ink-muted" />}
          />

          <Select
            options={paymentOptions}
            value={paymentMethod}
            onChange={(e) => {
              setPaymentMethod(e.target.value);
              setPage(1);
            }}
          />

          <Input
            type="date"
            label="Dari Tanggal"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(1);
            }}
          />

          <Input
            type="date"
            label="Sampai Tanggal"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {/* Sales Orders Table */}
      <div className="bg-white rounded-lg border border-surface-border shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center text-ink-muted text-xs">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span>Memuat riwayat faktur penjualan...</span>
          </div>
        ) : orders.length === 0 ? (
          <div className="py-16 text-center text-ink-muted text-xs">
            <Receipt className="w-10 h-10 mx-auto text-ink-subtle opacity-50 mb-2" />
            <p className="font-semibold text-ink text-sm">Belum ada transaksi penjualan</p>
            <p>Transaksi kasir yang telah diselesaikan akan tercatat di sini.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-muted border-b border-surface-border text-ink font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3.5">No. Faktur</th>
                  <th className="px-4 py-3.5">Waktu Transaksi</th>
                  <th className="px-4 py-3.5">Kasir</th>
                  <th className="px-4 py-3.5">Pelanggan</th>
                  <th className="px-4 py-3.5">Metode Bayar</th>
                  <th className="px-4 py-3.5 text-right">Total Transaksi</th>
                  <th className="px-4 py-3.5 text-center">Struk Nota</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border bg-white">
                {orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-surface-subtle/50 transition-colors">
                    <td className="px-4 py-3.5 font-mono font-bold text-ink">
                      {ord.invoiceNumber}
                    </td>
                    <td className="px-4 py-3.5 text-ink-muted whitespace-nowrap">
                      {formatDate(ord.createdAt)}
                    </td>
                    <td className="px-4 py-3.5 font-medium text-ink">
                      {ord.user?.name || 'Kasir'}
                    </td>
                    <td className="px-4 py-3.5 text-ink-muted">
                      {ord.customer?.name || 'Pelanggan Umum (Eceran)'}
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge
                        variant={
                          ord.paymentMethod === 'CASH'
                            ? 'success'
                            : ord.paymentMethod === 'TEMPO'
                            ? 'warning'
                            : 'info'
                        }
                      >
                        {ord.paymentMethod}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 text-right font-black text-brand-600 text-sm whitespace-nowrap">
                      {formatRupiah(ord.totalAmount)}
                    </td>
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenReceipt(ord.id)}
                        leftIcon={<Printer className="w-3.5 h-3.5 text-brand-600" />}
                      >
                        Lihat Struk
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {meta.totalPages > 1 && (
          <div className="px-6 py-3.5 bg-surface-muted/60 border-t border-surface-border flex items-center justify-between text-xs text-ink-muted">
            <div>
              Menampilkan Halaman <strong>{meta.page}</strong> dari{' '}
              <strong>{meta.totalPages}</strong> (Total {meta.total} transaksi)
            </div>
            <div className="flex items-center gap-2">
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
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Selanjutnya
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Printable Receipt Modal */}
      <ReceiptModal
        isOpen={!!selectedOrderForReceipt}
        onClose={() => setSelectedOrderForReceipt(null)}
        order={selectedOrderForReceipt}
        onNewTransaction={() => setSelectedOrderForReceipt(null)}
      />
    </div>
  );
};
