import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  RotateCcw,
  Search,
  Plus,
  Calendar,
  Receipt,
  Truck,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { api } from '../lib/api';
import { formatRupiah, formatDate } from '../lib/utils';
import { SaleReturn, PurchaseReturn } from '../types/return';
import { CreateSaleReturnModal } from '../components/returns/CreateSaleReturnModal';
import { CreatePurchaseReturnModal } from '../components/returns/CreatePurchaseReturnModal';

export const ReturnsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'sales' | 'purchases'>('sales');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);

  // Modals state
  const [isSaleReturnModalOpen, setIsSaleReturnModalOpen] = useState(false);
  const [isPurchaseReturnModalOpen, setIsPurchaseReturnModalOpen] = useState(false);

  // Query Sales Returns
  const { data: salesData, isLoading: isLoadingSales } = useQuery<{
    returns: SaleReturn[];
    pagination: { total: number; totalPages: number };
  }>({
    queryKey: ['sale-returns', page, search, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', '15');
      if (search.trim()) params.append('search', search.trim());
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      const res = await api.get(`/returns/sales?${params.toString()}`);
      return res.data.data;
    },
    enabled: activeTab === 'sales',
  });

  // Query Purchase Returns
  const { data: purchaseData, isLoading: isLoadingPurchases } = useQuery<{
    returns: PurchaseReturn[];
    pagination: { total: number; totalPages: number };
  }>({
    queryKey: ['purchase-returns', page, search, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', '15');
      if (search.trim()) params.append('search', search.trim());
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      const res = await api.get(`/returns/purchases?${params.toString()}`);
      return res.data.data;
    },
    enabled: activeTab === 'purchases',
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
            <RotateCcw className="w-7 h-7 text-brand-600" />
            Manajemen Retur Barang
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Pencatatan retur barang cacat/rusak dari pembeli dan klaim retur barang ke distributor sembako.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'sales' ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsSaleReturnModalOpen(true)}
              className="flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Buat Retur Penjualan
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsPurchaseReturnModalOpen(true)}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4" />
              Buat Retur ke Supplier
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-surface-border space-x-8">
        <button
          onClick={() => {
            setActiveTab('sales');
            setPage(1);
          }}
          className={`pb-3 font-semibold text-sm flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'sales'
              ? 'border-brand-600 text-brand-700'
              : 'border-transparent text-ink-muted hover:text-ink'
          }`}
        >
          <Receipt className="w-4 h-4" />
          Retur Penjualan Konsumen
        </button>

        <button
          onClick={() => {
            setActiveTab('purchases');
            setPage(1);
          }}
          className={`pb-3 font-semibold text-sm flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'purchases'
              ? 'border-brand-600 text-brand-700'
              : 'border-transparent text-ink-muted hover:text-ink'
          }`}
        >
          <Truck className="w-4 h-4" />
          Retur Pembelian ke Distributor
        </button>
      </div>

      {/* Filters Bar */}
      <Card className="p-4 bg-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex-1 max-w-md">
            <Input
              type="text"
              placeholder={
                activeTab === 'sales'
                  ? 'Cari no. retur atau no. invoice...'
                  : 'Cari no. retur atau nama distributor...'
              }
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              prefixElement={<Search className="w-4 h-4 text-ink-muted" />}
              className="text-xs h-9"
            />
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-ink-muted shrink-0" />
            <Input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="text-xs h-9 w-36"
            />
            <span className="text-xs text-ink-muted">s/d</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="text-xs h-9 w-36"
            />
          </div>
        </div>
      </Card>

      {/* Table Content */}
      {activeTab === 'sales' ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="w-5 h-5 text-ink-muted" />
              Riwayat Retur Penjualan Konsumen
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-surface-border bg-surface-muted/40 text-[11px] font-semibold text-ink-muted uppercase tracking-wider">
                    <th className="py-3 px-4">No. Retur</th>
                    <th className="py-3 px-4">No. Faktur Asli</th>
                    <th className="py-3 px-4">Pelanggan</th>
                    <th className="py-3 px-4">Alasan Retur</th>
                    <th className="py-3 px-4">Metode Refund</th>
                    <th className="py-3 px-4 text-right">Nilai Retur</th>
                    <th className="py-3 px-4">Tanggal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border text-xs">
                  {isLoadingSales ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-ink-muted">
                        Memuat data retur penjualan...
                      </td>
                    </tr>
                  ) : !salesData || salesData.returns.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-ink-muted">
                        Belum ada riwayat retur penjualan pada periode ini.
                      </td>
                    </tr>
                  ) : (
                    salesData.returns.map((ret) => (
                      <tr key={ret.id} className="hover:bg-surface-muted/30 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-brand-700">
                          {ret.returnNumber}
                        </td>
                        <td className="py-3 px-4 font-mono text-ink">
                          {ret.order.invoiceNumber}
                        </td>
                        <td className="py-3 px-4 font-medium text-ink">
                          {ret.order.customer?.name || 'Pelanggan Umum'}
                        </td>
                        <td className="py-3 px-4 text-ink-muted max-w-xs truncate">
                          {ret.reason}
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            variant={
                              ret.refundMethod === 'CASH'
                                ? 'success'
                                : ret.refundMethod === 'CREDIT_OFFSET'
                                ? 'info'
                                : 'outline'
                            }
                          >
                            {ret.refundMethod === 'CASH'
                              ? 'Tunai'
                              : ret.refundMethod === 'CREDIT_OFFSET'
                              ? 'Potong Bon'
                              : 'Tukar Barang'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right font-black text-rose-700">
                          {formatRupiah(ret.totalAmount)}
                        </td>
                        <td className="py-3 px-4 text-ink-muted whitespace-nowrap">
                          {formatDate(ret.createdAt)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Truck className="w-5 h-5 text-ink-muted" />
              Riwayat Retur Pembelian ke Distributor
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-surface-border bg-surface-muted/40 text-[11px] font-semibold text-ink-muted uppercase tracking-wider">
                    <th className="py-3 px-4">No. Retur</th>
                    <th className="py-3 px-4">No. Faktur Pembelian</th>
                    <th className="py-3 px-4">Distributor / Supplier</th>
                    <th className="py-3 px-4">Alasan Klaim</th>
                    <th className="py-3 px-4">Kompensasi</th>
                    <th className="py-3 px-4 text-right">Nilai Klaim</th>
                    <th className="py-3 px-4">Tanggal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border text-xs">
                  {isLoadingPurchases ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-ink-muted">
                        Memuat data retur pembelian...
                      </td>
                    </tr>
                  ) : !purchaseData || purchaseData.returns.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-ink-muted">
                        Belum ada riwayat retur pembelian ke distributor.
                      </td>
                    </tr>
                  ) : (
                    purchaseData.returns.map((ret) => (
                      <tr key={ret.id} className="hover:bg-surface-muted/30 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-blue-700">
                          {ret.returnNumber}
                        </td>
                        <td className="py-3 px-4 font-mono text-ink">
                          {ret.purchase.purchaseNumber}
                        </td>
                        <td className="py-3 px-4 font-semibold text-ink">
                          {ret.supplier.name}
                        </td>
                        <td className="py-3 px-4 text-ink-muted max-w-xs truncate">
                          {ret.reason}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={ret.refundMethod === 'DEBT_OFFSET' ? 'warning' : 'success'}>
                            {ret.refundMethod === 'DEBT_OFFSET' ? 'Potong Hutang' : 'Uang Tunai'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right font-black text-blue-700">
                          {formatRupiah(ret.totalAmount)}
                        </td>
                        <td className="py-3 px-4 text-ink-muted whitespace-nowrap">
                          {formatDate(ret.createdAt)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      <CreateSaleReturnModal
        isOpen={isSaleReturnModalOpen}
        onClose={() => setIsSaleReturnModalOpen(false)}
      />

      <CreatePurchaseReturnModal
        isOpen={isPurchaseReturnModalOpen}
        onClose={() => setIsPurchaseReturnModalOpen(false)}
      />
    </div>
  );
};
export default ReturnsPage;
