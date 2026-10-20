import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Boxes,
  ClipboardList,
  Search,
  Calendar,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Save,
  Camera,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { BarcodeScannerModal } from '../components/pos/BarcodeScannerModal';
import { api } from '../lib/api';
import { formatNumber } from '../lib/utils';
import { InventoryMovementLog } from '../types/inventory';
import { Product } from '../types/product';

export const InventoryPage: React.FC = () => {
  const queryClient = useQueryClient();

  // Active Tab
  const [activeTab, setActiveTab] = useState<'movements' | 'opname'>('movements');

  // Movements filter
  const [movementSearch, setMovementSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [movementPage, setMovementPage] = useState(1);

  // Opname states
  const [opnameSearch, setOpnameSearch] = useState('');
  const [opnameInputs, setOpnameInputs] = useState<Record<number, { physicalStock: number; note: string }>>({});
  const [opnameSuccessMsg, setOpnameSuccessMsg] = useState<string | null>(null);
  const [isScanningOpname, setIsScanningOpname] = useState(false);

  // 1. Fetch Movements Log
  const { data: movementsResponse, isLoading: isLoadingMovements } = useQuery<{
    data: InventoryMovementLog[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }>({
    queryKey: ['inventory-movements', movementSearch, typeFilter, startDate, endDate, movementPage],
    queryFn: async () => {
      const res = await api.get('/inventory/movements', {
        params: {
          search: movementSearch || undefined,
          type: typeFilter || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          page: movementPage,
          limit: 20,
        },
      });
      return {
        data: res.data.data || [],
        pagination: res.data.meta || res.data.pagination || { total: 0, page: 1, limit: 20, totalPages: 1 },
      };
    },
  });

  // 2. Fetch All Products for Stock Opname Sheet
  const { data: products = [], isLoading: isLoadingProducts } = useQuery<Product[]>({
    queryKey: ['products-opname'],
    queryFn: async () => {
      const res = await api.get('/products?limit=200');
      return res.data.data;
    },
  });

  // Handle Opname Input Change
  const handlePhysicalChange = (productId: number, val: number) => {
    setOpnameInputs((prev) => ({
      ...prev,
      [productId]: {
        physicalStock: val,
        note: prev[productId]?.note || '',
      },
    }));
  };

  const handleNoteChange = (productId: number, note: string) => {
    setOpnameInputs((prev) => ({
      ...prev,
      [productId]: {
        physicalStock: prev[productId]?.physicalStock ?? Number(products.find((p) => p.id === productId)?.currentStock || 0),
        note,
      },
    }));
  };

  // Submit Opname Mutation
  const opnameMutation = useMutation({
    mutationFn: async () => {
      const itemsToSubmit = Object.entries(opnameInputs).map(([prodId, val]) => ({
        productId: Number(prodId),
        physicalStock: val.physicalStock,
        note: val.note || undefined,
      }));

      if (itemsToSubmit.length === 0) {
        throw new Error('Belum ada stok fisik yang diubah atau dihitung.');
      }

      return api.post('/inventory/opname', { items: itemsToSubmit });
    },
    onSuccess: (res) => {
      setOpnameSuccessMsg(
        `Berhasil memproses opname! ${res.data.data.totalAdjusted} produk disesuaikan selisih stoknya.`
      );
      setOpnameInputs({});
      queryClient.invalidateQueries({ queryKey: ['products-opname'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-movements'] });
    },
    onError: (err: any) => {
      alert(err?.response?.data?.message || err.message || 'Gagal memproses stock opname.');
    },
  });

  const getMovementBadge = (type: string) => {
    switch (type) {
      case 'IN':
        return <Badge variant="success">MASUK (+)</Badge>;
      case 'OUT':
        return <Badge variant="danger">KELUAR (-)</Badge>;
      case 'ADJUSTMENT':
        return <Badge variant="warning">KOREKSI (OPNAME)</Badge>;
      case 'RETURN':
        return <Badge variant="info">RETUR</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const filteredOpnameProducts = products.filter((p) => {
    if (!opnameSearch.trim()) return true;
    const term = opnameSearch.toLowerCase();
    return (
      p.name.toLowerCase().includes(term) ||
      p.sku.toLowerCase().includes(term) ||
      (p.barcode && p.barcode.toLowerCase().includes(term)) ||
      p.units?.some((u) => u.barcode && u.barcode.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2.5">
            <Boxes className="w-7 h-7 text-brand-600" />
            <span>Mutasi Inventori & Stock Opname</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Audit trail log pergerakan stok sembako (penjualan kasir, kulakan masuk, opname fisik) secara transparan.
          </p>
        </div>

        {activeTab === 'opname' && (
          <Button
            onClick={() => opnameMutation.mutate()}
            isLoading={opnameMutation.isPending}
            className="flex items-center gap-2 shadow-sm font-semibold"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Penyesuaian Opname</span>
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => {
            setActiveTab('movements');
            setOpnameSuccessMsg(null);
          }}
          className={`py-3 px-5 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'movements'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>Log Audit Mutasi Stok</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-normal">
            {movementsResponse?.pagination?.total ?? 0}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab('opname');
            setOpnameSuccessMsg(null);
          }}
          className={`py-3 px-5 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'opname'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          <span>Lembar Stock Opname Fisik</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-normal">
            {products.length} Produk
          </span>
        </button>
      </div>

      {/* TAB 1: MOVEMENTS */}
      {activeTab === 'movements' && (
        <div className="space-y-4">
          <Card className="p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-2">
                <Input
                  value={movementSearch}
                  onChange={(e) => {
                    setMovementSearch(e.target.value);
                    setMovementPage(1);
                  }}
                  placeholder="Cari SKU, nama produk, no faktur ref, keterangan..."
                  prefixElement={<Search className="w-4 h-4 text-gray-400" />}
                />
              </div>

              <div>
                <Select
                  value={typeFilter}
                  onChange={(e) => {
                    setTypeFilter(e.target.value);
                    setMovementPage(1);
                  }}
                  options={[
                    { value: '', label: 'Semua Tipe Mutasi' },
                    { value: 'IN', label: 'Barang Masuk (Kulakan / IN)' },
                    { value: 'OUT', label: 'Barang Keluar (Kasir / OUT)' },
                    { value: 'ADJUSTMENT', label: 'Koreksi & Opname' },
                    { value: 'RETURN', label: 'Retur Barang' },
                  ]}
                />
              </div>

              <div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setMovementSearch('');
                    setTypeFilter('');
                    setStartDate('');
                    setEndDate('');
                    setMovementPage(1);
                  }}
                  className="w-full text-xs"
                >
                  Reset Filter
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2 border-t border-gray-100 text-xs text-gray-600">
              <span className="font-semibold flex items-center gap-1 text-gray-700">
                <Calendar className="w-3.5 h-3.5" /> Rentang Tanggal:
              </span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setMovementPage(1);
                }}
                className="px-2 py-1 text-xs rounded border border-gray-300"
              />
              <span>s/d</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setMovementPage(1);
                }}
                className="px-2 py-1 text-xs rounded border border-gray-300"
              />
            </div>
          </Card>

          <Card className="overflow-hidden shadow-xs border border-gray-200">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-100/80 text-gray-700 font-semibold border-b border-gray-200">
                  <tr>
                    <th className="py-3 px-4">Waktu</th>
                    <th className="py-3 px-4">Produk Sembako</th>
                    <th className="py-3 px-4 text-center">Tipe Mutasi</th>
                    <th className="py-3 px-4 text-center">Jumlah Perubahan</th>
                    <th className="py-3 px-4 text-center">Stok Sebelum</th>
                    <th className="py-3 px-4 text-center">Stok Akhir</th>
                    <th className="py-3 px-4">No. Ref Faktur</th>
                    <th className="py-3 px-4">Catatan Audit</th>
                    <th className="py-3 px-4">Petugas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {isLoadingMovements ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-gray-400">
                        Memuat data mutasi stok...
                      </td>
                    </tr>
                  ) : !movementsResponse?.data || movementsResponse.data.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-gray-400">
                        <Boxes className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                        <p className="font-semibold text-gray-600">Belum ada riwayat mutasi stok.</p>
                      </td>
                    </tr>
                  ) : (
                    movementsResponse.data.map((m) => {
                      const qty = Number(m.quantity);
                      const isPositive = m.type === 'IN';

                      return (
                        <tr key={m.id} className="hover:bg-gray-50/70 transition">
                          <td className="py-3 px-4 text-gray-600 whitespace-nowrap">
                            {new Date(m.createdAt).toLocaleDateString('id-ID', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-gray-900 block">{m.product.name}</span>
                            <span className="text-[11px] text-gray-400 font-mono">{m.product.sku}</span>
                          </td>
                          <td className="py-3 px-4 text-center">{getMovementBadge(m.type)}</td>
                          <td className="py-3 px-4 text-center font-bold">
                            <span
                              className={`inline-flex items-center gap-1 ${
                                isPositive ? 'text-emerald-700' : 'text-rose-700'
                              }`}
                            >
                              {isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                              {isPositive ? '+' : '-'}{formatNumber(qty)} {m.product.baseUnit}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center text-gray-600 font-medium">
                            {formatNumber(m.previousStock)} {m.product.baseUnit}
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-gray-900">
                            {formatNumber(m.currentStock)} {m.product.baseUnit}
                          </td>
                          <td className="py-3 px-4 font-mono font-medium text-gray-700">
                            {m.referenceId || '-'}
                          </td>
                          <td className="py-3 px-4 text-gray-600 max-w-xs truncate" title={m.note || ''}>
                            {m.note || '-'}
                          </td>
                          <td className="py-3 px-4 text-gray-700 font-medium">
                            {m.user?.name || 'Sistem'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {movementsResponse?.pagination && movementsResponse.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between p-3 border-t border-gray-100 bg-gray-50/50 text-xs">
                <span className="text-gray-500">
                  Menampilkan halaman {movementsResponse.pagination.page} dari{' '}
                  {movementsResponse.pagination.totalPages}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={movementPage <= 1}
                    onClick={() => setMovementPage((p) => p - 1)}
                  >
                    Sebelumnya
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={movementPage >= (movementsResponse?.pagination?.totalPages || 1)}
                    onClick={() => setMovementPage((p) => p + 1)}
                  >
                    Berikutnya
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB 2: STOCK OPNAME SHEET */}
      {activeTab === 'opname' && (
        <div className="space-y-4">
          {opnameSuccessMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{opnameSuccessMsg}</span>
            </div>
          )}

          <Card className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3 bg-brand-50/50 border-brand-200">
            <div className="w-full sm:w-80">
              <Input
                value={opnameSearch}
                onChange={(e) => setOpnameSearch(e.target.value)}
                placeholder="Cari barang atau scan barcode opname..."
                prefixElement={<Search className="w-4 h-4 text-gray-400" />}
                suffixElement={
                  <button
                    type="button"
                    onClick={() => setIsScanningOpname(true)}
                    className="p-1 hover:bg-brand-50 text-brand-600 rounded transition-colors"
                    title="Scan Barcode untuk Opname"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                }
              />
            </div>
            <div className="text-xs text-brand-900 font-medium">
              💡 Masukkan hitungan fisik nyata di kolom "Stok Fisik". Sistem akan otomatis menghitung selisih dan membuat log audit.
            </div>
          </Card>

          <Card className="overflow-hidden shadow-xs border border-gray-200">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-100/80 text-gray-700 font-semibold border-b border-gray-200">
                  <tr>
                    <th className="py-3 px-4 w-32">SKU</th>
                    <th className="py-3 px-4">Nama Produk Sembako</th>
                    <th className="py-3 px-4 text-center">Satuan Dasar</th>
                    <th className="py-3 px-4 text-right">Stok Sistem Saat Ini</th>
                    <th className="py-3 px-4 w-40 text-center">Stok Fisik Nyata</th>
                    <th className="py-3 px-4 text-center">Selisih (+ / -)</th>
                    <th className="py-3 px-4 w-60">Alasan / Catatan Opname</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {isLoadingProducts ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-400">
                        Memuat data produk untuk opname...
                      </td>
                    </tr>
                  ) : filteredOpnameProducts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-400">
                        Tidak ada produk ditemukan.
                      </td>
                    </tr>
                  ) : (
                    filteredOpnameProducts.map((p) => {
                      const systemStock = Number(p.currentStock);
                      const inputVal = opnameInputs[p.id];
                      const physicalStock = inputVal !== undefined ? inputVal.physicalStock : systemStock;
                      const diff = physicalStock - systemStock;

                      return (
                        <tr key={p.id} className="hover:bg-gray-50/70 transition">
                          <td className="py-3 px-4 font-mono font-bold text-gray-900">{p.sku}</td>
                          <td className="py-3 px-4 font-semibold text-gray-900">{p.name}</td>
                          <td className="py-3 px-4 text-center font-bold text-brand-700">{p.baseUnit}</td>
                          <td className="py-3 px-4 text-right font-bold text-gray-800">
                            {formatNumber(systemStock)} {p.baseUnit}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <input
                              type="number"
                              step="any"
                              value={physicalStock}
                              onChange={(e) => handlePhysicalChange(p.id, parseFloat(e.target.value) || 0)}
                              className="w-28 text-center font-bold px-2.5 py-1.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                            />
                          </td>
                          <td className="py-3 px-4 text-center font-bold">
                            {diff === 0 ? (
                              <span className="text-gray-400">Sesuai (0)</span>
                            ) : diff > 0 ? (
                              <span className="text-emerald-600 font-extrabold">
                                +{formatNumber(diff)} {p.baseUnit}
                              </span>
                            ) : (
                              <span className="text-rose-600 font-extrabold">
                                {formatNumber(diff)} {p.baseUnit}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="text"
                              value={inputVal?.note || ''}
                              onChange={(e) => handleNoteChange(p.id, e.target.value)}
                              placeholder="Misal: Kemasan bocor / rusak..."
                              className="w-full px-2 py-1 text-xs rounded border border-gray-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Barcode Scanner Modal for Stock Opname */}
      <BarcodeScannerModal
        isOpen={isScanningOpname}
        onClose={() => setIsScanningOpname(false)}
        title="Scan Barcode Lembar Stock Opname"
        scannerId="opname-barcode-scanner"
        onScan={(code) => {
          setOpnameSearch(code);
          setIsScanningOpname(false);
        }}
      />
    </div>
  );
};
