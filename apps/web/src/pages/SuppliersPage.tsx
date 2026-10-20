import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Truck,
  Warehouse,
  Plus,
  Search,
  Calendar,
  Clock,
  Eye,
  CreditCard,
  Edit2,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { api } from '../lib/api';
import { formatRupiah, formatNumber } from '../lib/utils';
import { Supplier, Purchase, PurchaseSummary } from '../types/supplier';
import { SupplierFormModal } from '../components/suppliers/SupplierFormModal';
import { PurchaseFormModal } from '../components/suppliers/PurchaseFormModal';
import { PurchaseDetailModal } from '../components/suppliers/PurchaseDetailModal';
import { DebtPaymentModal } from '../components/suppliers/DebtPaymentModal';

export const SuppliersPage: React.FC = () => {
  const queryClient = useQueryClient();

  // Active Tab
  const [activeTab, setActiveTab] = useState<'purchases' | 'suppliers'>('purchases');

  // Purchase Filters
  const [purchaseSearch, setPurchaseSearch] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<string>('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [purchasePage, setPurchasePage] = useState(1);

  // Supplier Filters
  const [supplierSearch, setSupplierSearch] = useState('');
  const [supplierPage, setSupplierPage] = useState(1);

  // Modals state
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<number | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [paymentTargetPurchase, setPaymentTargetPurchase] = useState<Purchase | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // 1. Fetch Purchase Summary Metrics
  const { data: summary } = useQuery<PurchaseSummary>({
    queryKey: ['purchases-summary'],
    queryFn: async () => {
      const res = await api.get('/purchases/summary');
      return res.data.data;
    },
  });

  // 2. Fetch Suppliers List
  const { data: suppliersResponse, isLoading: isLoadingSuppliers } = useQuery<{
    data: Supplier[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }>({
    queryKey: ['suppliers', supplierSearch, supplierPage],
    queryFn: async () => {
      const res = await api.get('/suppliers', {
        params: {
          search: supplierSearch || undefined,
          page: supplierPage,
          limit: 15,
        },
      });
      return {
        data: res.data.data || [],
        pagination: res.data.meta || res.data.pagination || { total: 0, page: 1, limit: 15, totalPages: 1 },
      };
    },
  });

  // Active suppliers for dropdown filter
  const { data: allActiveSuppliers = [] } = useQuery<Supplier[]>({
    queryKey: ['suppliers-active-dropdown'],
    queryFn: async () => {
      const res = await api.get('/suppliers?active=true&limit=100');
      return res.data.data;
    },
  });

  // 3. Fetch Purchases List
  const { data: purchasesResponse, isLoading: isLoadingPurchases } = useQuery<{
    data: Purchase[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }>({
    queryKey: [
      'purchases',
      purchaseSearch,
      selectedSupplierId,
      paymentTypeFilter,
      paymentStatusFilter,
      startDate,
      endDate,
      purchasePage,
    ],
    queryFn: async () => {
      const res = await api.get('/purchases', {
        params: {
          search: purchaseSearch || undefined,
          supplierId: selectedSupplierId ? Number(selectedSupplierId) : undefined,
          paymentType: paymentTypeFilter || undefined,
          paymentStatus: paymentStatusFilter || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          page: purchasePage,
          limit: 15,
        },
      });
      return {
        data: res.data.data || [],
        pagination: res.data.meta || res.data.pagination || { total: 0, page: 1, limit: 15, totalPages: 1 },
      };
    },
  });

  // Delete/Deactivate Supplier Mutation
  const deleteSupplierMutation = useMutation({
    mutationFn: async (id: number) => {
      return api.delete(`/suppliers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['purchases-summary'] });
    },
  });

  const handleDeleteSupplier = (supplier: Supplier) => {
    if (confirm(`Yakin ingin menonaktifkan supplier "${supplier.name}"?`)) {
      deleteSupplierMutation.mutate(supplier.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2.5">
            <Warehouse className="w-7 h-7 text-brand-600" />
            <span>Supplier & Pembelian Kulakan</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Manajemen distributor grosir, restock barang masuk, dan audit pembayaran tempo hutang dagang.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {activeTab === 'purchases' ? (
            <Button
              onClick={() => setIsPurchaseModalOpen(true)}
              className="flex items-center gap-2 shadow-sm font-semibold"
            >
              <Plus className="w-4 h-4" />
              <span>Catat Pembelian / Restock</span>
            </Button>
          ) : (
            <Button
              onClick={() => {
                setSelectedSupplier(null);
                setIsSupplierModalOpen(true);
              }}
              className="flex items-center gap-2 shadow-sm font-semibold"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Supplier Baru</span>
            </Button>
          )}
        </div>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Pembelian Bulan Ini */}
        <Card className="p-4 border-l-4 border-l-brand-600 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600 shrink-0">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Kulakan Bulan Ini</p>
            <p className="text-lg font-black text-gray-900">
              {formatRupiah(summary?.monthlyTotalAmount || 0)}
            </p>
            <p className="text-[11px] text-gray-500 font-medium">
              {formatNumber(summary?.monthlyPurchaseCount || 0)} transaksi restock
            </p>
          </div>
        </Card>

        {/* Card 2: Total Hutang Tempo */}
        <Card className="p-4 border-l-4 border-l-amber-500 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Total Hutang Dagang</p>
            <p className="text-lg font-black text-amber-900">
              {formatRupiah(summary?.totalUnpaidDebt || 0)}
            </p>
            <p className="text-[11px] text-amber-700 font-medium">
              {formatNumber(summary?.tempoPurchasesCount || 0)} faktur tempo belum lunas
            </p>
          </div>
        </Card>

        {/* Card 3: Jatuh Tempo Dekat */}
        <Card className="p-4 border-l-4 border-l-rose-500 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Jatuh Tempo (≤ 7 Hari)</p>
            <p className="text-lg font-black text-rose-700">
              {formatNumber(summary?.dueSoonCount || 0)} Faktur
            </p>
            <p className="text-[11px] text-rose-600 font-medium">Prioritas pembayaran</p>
          </div>
        </Card>

        {/* Card 4: Supplier Aktif */}
        <Card className="p-4 border-l-4 border-l-blue-500 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
            <Warehouse className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Supplier Aktif</p>
            <p className="text-lg font-black text-gray-900">
              {formatNumber(summary?.activeSuppliersCount || 0)} Rekanan
            </p>
            <p className="text-[11px] text-blue-600 font-medium">Distributor grosir sembako</p>
          </div>
        </Card>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('purchases')}
          className={`py-3 px-5 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'purchases'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Faktur Pembelian & Restock</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-normal">
            {purchasesResponse?.pagination?.total ?? 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('suppliers')}
          className={`py-3 px-5 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'suppliers'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <Warehouse className="w-4 h-4" />
          <span>Master Data Supplier</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-normal">
            {suppliersResponse?.pagination?.total ?? 0}
          </span>
        </button>
      </div>

      {/* TAB 1: PURCHASES */}
      {activeTab === 'purchases' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <Card className="p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Search */}
              <div className="lg:col-span-2">
                <Input
                  value={purchaseSearch}
                  onChange={(e) => {
                    setPurchaseSearch(e.target.value);
                    setPurchasePage(1);
                  }}
                  placeholder="Cari No. Faktur / Surat Jalan / Supplier..."
                  prefixElement={<Search className="w-4 h-4 text-gray-400" />}
                />
              </div>

              {/* Supplier Filter */}
              <div>
                <Select
                  value={selectedSupplierId}
                  onChange={(e) => {
                    setSelectedSupplierId(e.target.value);
                    setPurchasePage(1);
                  }}
                  options={[
                    { value: '', label: 'Semua Supplier' },
                    ...allActiveSuppliers.map((s) => ({
                      value: s.id,
                      label: s.name,
                    })),
                  ]}
                />
              </div>

              {/* Payment Type */}
              <div>
                <Select
                  value={paymentTypeFilter}
                  onChange={(e) => {
                    setPaymentTypeFilter(e.target.value);
                    setPurchasePage(1);
                  }}
                  options={[
                    { value: '', label: 'Semua Sistem Bayar' },
                    { value: 'CASH', label: 'Tunai (CASH)' },
                    { value: 'TEMPO', label: 'Tempo (Hutang)' },
                  ]}
                />
              </div>

              {/* Status Pelunasan */}
              <div>
                <Select
                  value={paymentStatusFilter}
                  onChange={(e) => {
                    setPaymentStatusFilter(e.target.value);
                    setPurchasePage(1);
                  }}
                  options={[
                    { value: '', label: 'Semua Status Pelunasan' },
                    { value: 'PAID', label: 'Lunas' },
                    { value: 'UNPAID', label: 'Belum Lunas' },
                    { value: 'PARTIAL', label: 'Cicilan / Sebagian' },
                  ]}
                />
              </div>

              {/* Reset Filter Button */}
              <div className="flex items-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPurchaseSearch('');
                    setSelectedSupplierId('');
                    setPaymentTypeFilter('');
                    setPaymentStatusFilter('');
                    setStartDate('');
                    setEndDate('');
                    setPurchasePage(1);
                  }}
                  className="w-full text-xs"
                >
                  Reset Filter
                </Button>
              </div>
            </div>

            {/* Date Range Row */}
            <div className="flex items-center gap-3 pt-2 border-t border-gray-100 text-xs text-gray-600">
              <span className="font-semibold flex items-center gap-1 text-gray-700">
                <Calendar className="w-3.5 h-3.5" /> Rentang Tanggal:
              </span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPurchasePage(1);
                }}
                className="px-2 py-1 text-xs rounded border border-gray-300"
              />
              <span>s/d</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPurchasePage(1);
                }}
                className="px-2 py-1 text-xs rounded border border-gray-300"
              />
            </div>
          </Card>

          {/* Purchases Table */}
          <Card className="overflow-hidden shadow-xs border border-gray-200">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-100/80 text-gray-700 font-semibold border-b border-gray-200">
                  <tr>
                    <th className="py-3 px-4">No. Faktur & SJ</th>
                    <th className="py-3 px-4">Tanggal Masuk</th>
                    <th className="py-3 px-4">Supplier</th>
                    <th className="py-3 px-4 text-center">Tipe Bayar</th>
                    <th className="py-3 px-4 text-right">Total Faktur</th>
                    <th className="py-3 px-4 text-right">Sisa Hutang</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {isLoadingPurchases ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-gray-400">
                        Memuat data faktur pembelian...
                      </td>
                    </tr>
                  ) : purchasesResponse?.data.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-gray-400">
                        <Truck className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                        <p className="font-semibold text-gray-600">Belum ada faktur pembelian.</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Klik tombol "+ Catat Pembelian / Restock" untuk mencatat barang masuk.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    purchasesResponse?.data.map((p) => {
                      const total = Number(p.totalAmount);
                      const paid = Number(p.amountPaid);
                      const remaining = Math.max(0, total - paid);

                      return (
                        <tr key={p.id} className="hover:bg-gray-50/70 transition">
                          <td className="py-3 px-4">
                            <span className="font-bold text-gray-900 block font-mono">
                              {p.purchaseNumber}
                            </span>
                            {p.supplierInvoiceNo ? (
                              <span className="text-[11px] text-gray-500">
                                SJ: {p.supplierInvoiceNo}
                              </span>
                            ) : (
                              <span className="text-[10px] text-gray-400 italic">Tanpa No. SJ</span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-gray-600">
                            {new Date(p.purchaseDate).toLocaleDateString('id-ID', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>

                          <td className="py-3 px-4">
                            <span className="font-semibold text-gray-900 block">
                              {p.supplier?.name}
                            </span>
                            <span className="text-[11px] text-gray-400 font-mono">
                              {p.supplier?.code}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-center">
                            <span
                              className={`text-[11px] px-2 py-0.5 rounded font-bold ${
                                p.paymentType === 'CASH'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-amber-50 text-amber-700'
                              }`}
                            >
                              {p.paymentType === 'CASH' ? 'TUNAI' : 'TEMPO'}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right font-bold text-gray-900">
                            {formatRupiah(total)}
                          </td>

                          <td className="py-3 px-4 text-right font-bold">
                            {remaining > 0 ? (
                              <div>
                                <span className="text-rose-600">{formatRupiah(remaining)}</span>
                                {p.dueDate && (
                                  <span className="text-[10px] text-gray-400 block font-normal">
                                    Tempo: {new Date(p.dueDate).toLocaleDateString('id-ID')}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-emerald-600 font-normal text-[11px] flex items-center justify-end gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Lunas
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-center">
                            <Badge
                              variant={
                                p.paymentStatus === 'PAID'
                                  ? 'success'
                                  : p.paymentStatus === 'PARTIAL'
                                  ? 'warning'
                                  : 'danger'
                              }
                            >
                              {p.paymentStatus === 'PAID'
                                ? 'LUNAS'
                                : p.paymentStatus === 'PARTIAL'
                                ? 'SEBAGIAN'
                                : 'BELUM LUNAS'}
                            </Badge>
                          </td>

                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedPurchaseId(p.id);
                                  setIsDetailModalOpen(true);
                                }}
                                className="p-1.5 rounded-md text-gray-500 hover:text-brand-600 hover:bg-brand-50 transition"
                                title="Lihat detail faktur"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {remaining > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPaymentTargetPurchase(p);
                                    setIsPaymentModalOpen(true);
                                  }}
                                  className="px-2 py-1 rounded-md text-[11px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition"
                                  title="Bayar cicilan / lunas tempo"
                                >
                                  Bayar
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {purchasesResponse?.pagination && purchasesResponse.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between p-3 border-t border-gray-100 bg-gray-50/50 text-xs">
                <span className="text-gray-500">
                  Menampilkan halaman {purchasesResponse.pagination.page} dari{' '}
                  {purchasesResponse.pagination.totalPages} ({purchasesResponse.pagination.total}{' '}
                  faktur)
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={purchasePage <= 1}
                    onClick={() => setPurchasePage((p) => p - 1)}
                  >
                    Sebelumnya
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={purchasePage >= (purchasesResponse?.pagination?.totalPages || 1)}
                    onClick={() => setPurchasePage((p) => p + 1)}
                  >
                    Berikutnya
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB 2: SUPPLIERS */}
      {activeTab === 'suppliers' && (
        <div className="space-y-4">
          {/* Search bar */}
          <Card className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="w-full sm:w-80">
              <Input
                value={supplierSearch}
                onChange={(e) => {
                  setSupplierSearch(e.target.value);
                  setSupplierPage(1);
                }}
                placeholder="Cari kode, nama supplier, kontak, alamat..."
                prefixElement={<Search className="w-4 h-4 text-gray-400" />}
              />
            </div>
          </Card>

          {/* Suppliers Table */}
          <Card className="overflow-hidden shadow-xs border border-gray-200">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-100/80 text-gray-700 font-semibold border-b border-gray-200">
                  <tr>
                    <th className="py-3 px-4 w-28">Kode</th>
                    <th className="py-3 px-4">Nama Perusahaan / Supplier</th>
                    <th className="py-3 px-4">Kontak Person</th>
                    <th className="py-3 px-4">Telepon / WhatsApp</th>
                    <th className="py-3 px-4">Alamat Gudang</th>
                    <th className="py-3 px-4 text-center">Faktur Kulakan</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {isLoadingSuppliers ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-gray-400">
                        Memuat data supplier...
                      </td>
                    </tr>
                  ) : suppliersResponse?.data.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-gray-400">
                        <Warehouse className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                        <p className="font-semibold text-gray-600">Tidak ada supplier ditemukan.</p>
                      </td>
                    </tr>
                  ) : (
                    suppliersResponse?.data.map((s) => (
                      <tr key={s.id} className="hover:bg-gray-50/70 transition">
                        <td className="py-3 px-4 font-mono font-bold text-gray-900">{s.code}</td>
                        <td className="py-3 px-4 font-semibold text-gray-900">{s.name}</td>
                        <td className="py-3 px-4 text-gray-700">{s.contactPerson || '-'}</td>
                        <td className="py-3 px-4 text-gray-700 font-mono">{s.phone || '-'}</td>
                        <td className="py-3 px-4 text-gray-600 truncate max-w-xs">
                          {s.address || '-'}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-gray-800">
                          {s._count?.purchases || 0}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant={s.isActive ? 'success' : 'outline'}>
                            {s.isActive ? 'Aktif' : 'Non-aktif'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedSupplier(s);
                                setIsSupplierModalOpen(true);
                              }}
                              className="p-1.5 rounded-md text-gray-500 hover:text-brand-600 hover:bg-brand-50 transition"
                              title="Edit supplier"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSupplier(s)}
                              className="p-1.5 rounded-md text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition"
                              title="Hapus / Nonaktifkan"
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

            {/* Pagination */}
            {suppliersResponse?.pagination && suppliersResponse.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between p-3 border-t border-gray-100 bg-gray-50/50 text-xs">
                <span className="text-gray-500">
                  Menampilkan halaman {suppliersResponse.pagination.page} dari{' '}
                  {suppliersResponse.pagination.totalPages} ({suppliersResponse.pagination.total}{' '}
                  supplier)
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={supplierPage <= 1}
                    onClick={() => setSupplierPage((p) => p - 1)}
                  >
                    Sebelumnya
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={supplierPage >= (suppliersResponse?.pagination?.totalPages || 1)}
                    onClick={() => setSupplierPage((p) => p + 1)}
                  >
                    Berikutnya
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* MODALS */}
      <SupplierFormModal
        isOpen={isSupplierModalOpen}
        onClose={() => setIsSupplierModalOpen(false)}
        initialData={selectedSupplier}
      />

      <PurchaseFormModal
        isOpen={isPurchaseModalOpen}
        onClose={() => setIsPurchaseModalOpen(false)}
      />

      <PurchaseDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        purchaseId={selectedPurchaseId}
        onOpenPayment={(purchase) => {
          setPaymentTargetPurchase(purchase);
          setIsPaymentModalOpen(true);
        }}
      />

      <DebtPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        purchase={paymentTargetPurchase}
      />
    </div>
  );
};
