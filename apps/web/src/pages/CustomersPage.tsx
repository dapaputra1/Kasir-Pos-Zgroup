import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  CreditCard,
  Plus,
  Search,
  Clock,
  Edit2,
  Trash2,
  CheckCircle2,
  Receipt,
  Store,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { api } from '../lib/api';
import { formatRupiah, formatNumber } from '../lib/utils';
import { Customer, CustomerReceivableOrder, ReceivablesSummary } from '../types/customer';
import { CustomerFormModal } from '../components/customers/CustomerFormModal';
import { CustomerDebtPaymentModal } from '../components/customers/CustomerDebtPaymentModal';

export const CustomersPage: React.FC = () => {
  const queryClient = useQueryClient();

  // Active Tab
  const [activeTab, setActiveTab] = useState<'receivables' | 'customers'>('receivables');

  // Customer List Filters
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerTierFilter, setCustomerTierFilter] = useState('');
  const [customerPage, setCustomerPage] = useState(1);

  // Receivables Filters
  const [receivableSearch, setReceivableSearch] = useState('');
  const [receivableStatusFilter, setReceivableStatusFilter] = useState<string>('');
  const [receivablePage, setReceivablePage] = useState(1);

  // Modals state
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const [paymentTargetOrder, setPaymentTargetOrder] = useState<CustomerReceivableOrder | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // 1. Fetch Receivables Summary Metrics
  const { data: summary } = useQuery<ReceivablesSummary>({
    queryKey: ['receivables-summary'],
    queryFn: async () => {
      const res = await api.get('/customers/receivables/summary');
      return res.data.data;
    },
  });

  // 2. Fetch Customers List
  const { data: customersResponse, isLoading: isLoadingCustomers } = useQuery<{
    data: Customer[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }>({
    queryKey: ['customers', customerSearch, customerTierFilter, customerPage],
    queryFn: async () => {
      const res = await api.get('/customers', {
        params: {
          search: customerSearch || undefined,
          tier: customerTierFilter || undefined,
          page: customerPage,
          limit: 15,
        },
      });
      return {
        data: res.data.data || [],
        pagination: res.data.meta || res.data.pagination || { total: 0, page: 1, limit: 15, totalPages: 1 },
      };
    },
  });

  // 3. Fetch Receivables (Unpaid Bon) List
  const { data: receivablesResponse, isLoading: isLoadingReceivables } = useQuery<{
    data: CustomerReceivableOrder[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }>({
    queryKey: ['receivables', receivableSearch, receivableStatusFilter, receivablePage],
    queryFn: async () => {
      const res = await api.get('/customers/receivables', {
        params: {
          search: receivableSearch || undefined,
          status: receivableStatusFilter || undefined,
          page: receivablePage,
          limit: 15,
        },
      });
      return {
        data: res.data.data || [],
        pagination: res.data.meta || res.data.pagination || { total: 0, page: 1, limit: 15, totalPages: 1 },
      };
    },
  });

  // Delete Customer Mutation
  const deleteCustomerMutation = useMutation({
    mutationFn: async (id: number) => {
      return api.delete(`/customers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['receivables-summary'] });
    },
  });

  const handleDeleteCustomer = (customer: Customer) => {
    if (confirm(`Yakin ingin menonaktifkan pelanggan "${customer.name}"?`)) {
      deleteCustomerMutation.mutate(customer.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2.5">
            <Users className="w-7 h-7 text-brand-600" />
            <span>Manajemen Pelanggan & Piutang Bon</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Data warung langganan grosir sembako, batas plafon kredit, dan pelunasan bon piutang tempo.
          </p>
        </div>

        <Button
          onClick={() => {
            setSelectedCustomer(null);
            setIsCustomerModalOpen(true);
          }}
          className="flex items-center gap-2 shadow-sm font-semibold"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Pelanggan Baru</span>
        </Button>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-amber-500 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Total Piutang Berjalan</p>
            <p className="text-lg font-black text-amber-900">
              {formatRupiah(summary?.totalReceivables || 0)}
            </p>
            <p className="text-[11px] text-amber-700 font-medium">Uang toko di pelanggan</p>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-rose-500 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 shrink-0">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Faktur Bon Belum Lunas</p>
            <p className="text-lg font-black text-rose-700">
              {formatNumber(summary?.unpaidOrdersCount || 0)} Transaksi
            </p>
            <p className="text-[11px] text-rose-600 font-medium">Perlu penagihan</p>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-purple-500 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Jatuh Tempo (≤ 7 Hari)</p>
            <p className="text-lg font-black text-purple-900">
              {formatNumber(summary?.dueSoonCount || 0)} Faktur
            </p>
            <p className="text-[11px] text-purple-600 font-medium">Batas waktu segera habis</p>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-brand-600 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600 shrink-0">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Pelanggan Aktif</p>
            <p className="text-lg font-black text-gray-900">
              {formatNumber(summary?.activeCustomersCount || 0)} Toko/Warung
            </p>
            <p className="text-[11px] text-brand-600 font-medium">Terdaftar di sistem</p>
          </div>
        </Card>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('receivables')}
          className={`py-3 px-5 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'receivables'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Buku Piutang Bon Tempo</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-normal">
            {receivablesResponse?.pagination?.total ?? 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('customers')}
          className={`py-3 px-5 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'customers'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Master Pelanggan</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-normal">
            {customersResponse?.pagination?.total ?? 0}
          </span>
        </button>
      </div>

      {/* TAB 1: PIUTANG BON */}
      {activeTab === 'receivables' && (
        <div className="space-y-4">
          <Card className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="w-full sm:w-80">
              <Input
                value={receivableSearch}
                onChange={(e) => {
                  setReceivableSearch(e.target.value);
                  setReceivablePage(1);
                }}
                placeholder="Cari No Faktur, Nama Warung, Kode..."
                prefixElement={<Search className="w-4 h-4 text-gray-400" />}
              />
            </div>

            <div className="w-full sm:w-60">
              <Select
                value={receivableStatusFilter}
                onChange={(e) => {
                  setReceivableStatusFilter(e.target.value);
                  setReceivablePage(1);
                }}
                options={[
                  { value: '', label: 'Semua Belum Lunas (Aktif)' },
                  { value: 'UNPAID', label: 'Belum Ada Pembayaran' },
                  { value: 'PARTIAL', label: 'Sudah Ada Cicilan' },
                  { value: 'PAID', label: 'Sudah Lunas' },
                ]}
              />
            </div>
          </Card>

          <Card className="overflow-hidden shadow-xs border border-gray-200">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-100/80 text-gray-700 font-semibold border-b border-gray-200">
                  <tr>
                    <th className="py-3 px-4">No. Faktur Bon</th>
                    <th className="py-3 px-4">Tanggal Transaksi</th>
                    <th className="py-3 px-4">Nama Pelanggan / Warung</th>
                    <th className="py-3 px-4 text-right">Total Belanja</th>
                    <th className="py-3 px-4 text-right">Sudah Dibayar</th>
                    <th className="py-3 px-4 text-right">Sisa Piutang</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {isLoadingReceivables ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-gray-400">
                        Memuat data piutang bon...
                      </td>
                    </tr>
                  ) : !receivablesResponse?.data || receivablesResponse.data.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-gray-400">
                        <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400 mb-2" />
                        <p className="font-semibold text-gray-600">Tidak ada piutang yang belum lunas!</p>
                        <p className="text-xs text-gray-400 mt-1">Semua transaksi bon pelanggan sudah lunas.</p>
                      </td>
                    </tr>
                  ) : (
                    receivablesResponse?.data.map((order) => {
                      const total = Number(order.totalAmount);
                      const paid = Number(order.amountPaid);
                      const remaining = Math.max(0, total - paid);

                      return (
                        <tr key={order.id} className="hover:bg-gray-50/70 transition">
                          <td className="py-3 px-4 font-mono font-bold text-gray-900">
                            {order.invoiceNumber}
                          </td>
                          <td className="py-3 px-4 text-gray-600">
                            {new Date(order.createdAt).toLocaleDateString('id-ID')}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-gray-900 block">
                              {order.customer?.name || 'Pelanggan Umum'}
                            </span>
                            <span className="text-[11px] text-gray-400">
                              {order.customer?.phone || '-'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-gray-900">
                            {formatRupiah(total)}
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-emerald-700">
                            {formatRupiah(paid)}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-rose-600">
                            {formatRupiah(remaining)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge
                              variant={
                                order.paymentStatus === 'PAID'
                                  ? 'success'
                                  : order.paymentStatus === 'PARTIAL'
                                  ? 'warning'
                                  : 'danger'
                              }
                            >
                              {order.paymentStatus === 'PAID'
                                ? 'LUNAS'
                                : order.paymentStatus === 'PARTIAL'
                                ? 'CICILAN'
                                : 'BELUM BAYAR'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {remaining > 0 ? (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setPaymentTargetOrder(order);
                                  setIsPaymentModalOpen(true);
                                }}
                                className="text-xs py-1 px-3 bg-amber-600 hover:bg-amber-700 text-white"
                              >
                                Terima Bayar
                              </Button>
                            ) : (
                              <span className="text-[11px] text-emerald-600 font-semibold">Lunas</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {receivablesResponse?.pagination && receivablesResponse.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between p-3 border-t border-gray-100 bg-gray-50/50 text-xs">
                <span className="text-gray-500">
                  Menampilkan halaman {receivablesResponse.pagination.page} dari{' '}
                  {receivablesResponse.pagination.totalPages}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={receivablePage <= 1}
                    onClick={() => setReceivablePage((p) => p - 1)}
                  >
                    Sebelumnya
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={receivablePage >= (receivablesResponse?.pagination?.totalPages || 1)}
                    onClick={() => setReceivablePage((p) => p + 1)}
                  >
                    Berikutnya
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB 2: MASTER CUSTOMERS */}
      {activeTab === 'customers' && (
        <div className="space-y-4">
          <Card className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="w-full sm:w-80">
              <Input
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
                  setCustomerPage(1);
                }}
                placeholder="Cari kode, nama toko, telepon, alamat..."
                prefixElement={<Search className="w-4 h-4 text-gray-400" />}
              />
            </div>

            <div className="w-full sm:w-48">
              <Select
                value={customerTierFilter}
                onChange={(e) => {
                  setCustomerTierFilter(e.target.value);
                  setCustomerPage(1);
                }}
                options={[
                  { value: '', label: 'Semua Kategori (Tier)' },
                  { value: 'REGULAR', label: 'Eceran (REGULAR)' },
                  { value: 'GROSIR', label: 'Grosir (GROSIR)' },
                  { value: 'VIP', label: 'Agen Besar (VIP)' },
                ]}
              />
            </div>
          </Card>

          <Card className="overflow-hidden shadow-xs border border-gray-200">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-100/80 text-gray-700 font-semibold border-b border-gray-200">
                  <tr>
                    <th className="py-3 px-4 w-28">Kode</th>
                    <th className="py-3 px-4">Nama Pelanggan / Warung</th>
                    <th className="py-3 px-4 text-center">Kategori</th>
                    <th className="py-3 px-4">WhatsApp / Telepon</th>
                    <th className="py-3 px-4">Alamat</th>
                    <th className="py-3 px-4 text-right">Plafon Kredit</th>
                    <th className="py-3 px-4 text-right">Piutang Aktif</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {isLoadingCustomers ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-gray-400">
                        Memuat data pelanggan...
                      </td>
                    </tr>
                  ) : !customersResponse?.data || customersResponse.data.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-gray-400">
                        <Users className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                        <p className="font-semibold text-gray-600">Tidak ada pelanggan ditemukan.</p>
                      </td>
                    </tr>
                  ) : (
                    customersResponse?.data.map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50/70 transition">
                        <td className="py-3 px-4 font-mono font-bold text-gray-900">{c.code}</td>
                        <td className="py-3 px-4 font-semibold text-gray-900">{c.name}</td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                              c.tier === 'VIP'
                                ? 'bg-purple-100 text-purple-800'
                                : c.tier === 'GROSIR'
                                ? 'bg-brand-100 text-brand-800'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {c.tier}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-700 font-mono">{c.phone || '-'}</td>
                        <td className="py-3 px-4 text-gray-600 truncate max-w-xs">{c.address || '-'}</td>
                        <td className="py-3 px-4 text-right font-medium text-gray-700">
                          {Number(c.creditLimit) > 0 ? formatRupiah(c.creditLimit) : 'Tanpa Limit'}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-rose-600">
                          {formatRupiah(c.totalDebt || 0)}
                        </td>
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
                                setSelectedCustomer(c);
                                setIsCustomerModalOpen(true);
                              }}
                              className="p-1.5 rounded-md text-gray-500 hover:text-brand-600 hover:bg-brand-50 transition"
                              title="Edit pelanggan"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCustomer(c)}
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
            {customersResponse?.pagination && customersResponse.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between p-3 border-t border-gray-100 bg-gray-50/50 text-xs">
                <span className="text-gray-500">
                  Menampilkan halaman {customersResponse.pagination.page} dari{' '}
                  {customersResponse.pagination.totalPages}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={customerPage <= 1}
                    onClick={() => setCustomerPage((p) => p - 1)}
                  >
                    Sebelumnya
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={customerPage >= (customersResponse?.pagination?.totalPages || 1)}
                    onClick={() => setCustomerPage((p) => p + 1)}
                  >
                    Berikutnya
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Modals */}
      <CustomerFormModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        initialData={selectedCustomer}
      />

      <CustomerDebtPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        order={paymentTargetOrder}
      />
    </div>
  );
};
