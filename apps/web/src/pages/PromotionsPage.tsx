import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Tag,
  Gift,
  Plus,
  Search,
  Percent,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  Layers,
  TrendingDown,
  Info,
  Sparkles,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { api } from '../lib/api';
import { formatRupiah, formatNumber } from '../lib/utils';
import { Promotion, BundleProduct } from '../types/promotion';
import { Product } from '../types/product';

export const PromotionsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'promotions' | 'bundles' | 'tiers'>('promotions');

  // Search filters
  const [promoSearch, setPromoSearch] = useState('');

  // Promotion Modal state
  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);
  const [promoForm, setPromoForm] = useState({
    code: '',
    name: '',
    description: '',
    type: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED',
    value: 5,
    minPurchase: 100000,
    maxDiscount: 25000,
    quota: 100,
    isActive: true,
  });

  // Bundle Modal state
  const [isBundleModalOpen, setIsBundleModalOpen] = useState(false);
  const [selectedBundleProduct, setSelectedBundleProduct] = useState<number | null>(null);
  const [bundleComponents, setBundleComponents] = useState<{ componentProductId: number; quantity: number }[]>([]);

  // Volume Tier state
  const [selectedUnitProduct, setSelectedUnitProduct] = useState<number | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<number | null>(null);
  const [tierInputs, setTierInputs] = useState<{ minQuantity: number; price: number; label: string }[]>([]);

  // 1. Fetch Promotions Query
  const { data: promoData, isLoading: isLoadingPromos } = useQuery<{ promotions: Promotion[] }>({
    queryKey: ['promotions', promoSearch],
    queryFn: async () => {
      const res = await api.get('/promotions', { params: { search: promoSearch } });
      return res.data.data;
    },
  });

  // 2. Fetch Bundles Query
  const { data: bundleList, isLoading: isLoadingBundles } = useQuery<BundleProduct[]>({
    queryKey: ['bundles'],
    queryFn: async () => {
      const res = await api.get('/bundles');
      return res.data.data;
    },
  });

  // 3. Fetch All Products (for select dropdowns)
  const { data: allProductsData } = useQuery<{ products: Product[] }>({
    queryKey: ['all-products-for-promos'],
    queryFn: async () => {
      const res = await api.get('/products?limit=200');
      return res.data.data;
    },
  });

  const products = allProductsData?.products || [];

  // Mutations for Promotion
  const savePromoMutation = useMutation({
    mutationFn: async () => {
      if (editingPromo) {
        return api.put(`/promotions/${editingPromo.id}`, promoForm);
      }
      return api.post('/promotions', promoForm);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      setIsPromoModalOpen(false);
      setEditingPromo(null);
    },
  });

  const deletePromoMutation = useMutation({
    mutationFn: async (id: number) => {
      return api.delete(`/promotions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
    },
  });

  // Mutations for Bundle
  const saveBundleMutation = useMutation({
    mutationFn: async () => {
      if (!selectedBundleProduct) return;
      return api.post(`/bundles/${selectedBundleProduct}`, {
        components: bundleComponents,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bundles'] });
      queryClient.invalidateQueries({ queryKey: ['all-products-for-promos'] });
      setIsBundleModalOpen(false);
      setSelectedBundleProduct(null);
      setBundleComponents([]);
    },
  });

  // Mutations for Volume Tiers
  const saveTiersMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUnitId) return;
      return api.post(`/bundles/units/${selectedUnitId}/tiers`, {
        tiers: tierInputs,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-products-for-promos'] });
      alert('Diskon bertingkat berhasil disimpan!');
    },
  });

  // Open Promo Modal for Create
  const handleOpenCreatePromo = () => {
    setEditingPromo(null);
    setPromoForm({
      code: '',
      name: '',
      description: '',
      type: 'PERCENTAGE',
      value: 5,
      minPurchase: 100000,
      maxDiscount: 25000,
      quota: 100,
      isActive: true,
    });
    setIsPromoModalOpen(true);
  };

  // Open Promo Modal for Edit
  const handleOpenEditPromo = (p: Promotion) => {
    setEditingPromo(p);
    setPromoForm({
      code: p.code,
      name: p.name,
      description: p.description || '',
      type: p.type,
      value: Number(p.value),
      minPurchase: Number(p.minPurchase),
      maxDiscount: p.maxDiscount ? Number(p.maxDiscount) : 0,
      quota: p.quota ?? 100,
      isActive: p.isActive,
    });
    setIsPromoModalOpen(true);
  };

  // Handle Unit Selection for Tier Pricing
  const handleSelectProductForTiers = (prodId: number) => {
    setSelectedUnitProduct(prodId);
    const prod = products.find((p) => p.id === prodId);
    if (prod && prod.units.length > 0) {
      const unit = prod.units[0];
      setSelectedUnitId(unit.id || null);
      if (unit.priceTiers && unit.priceTiers.length > 0) {
        setTierInputs(
          unit.priceTiers.map((t) => ({
            minQuantity: Number(t.minQuantity),
            price: Number(t.price),
            label: t.label || '',
          }))
        );
      } else {
        setTierInputs([
          { minQuantity: 5, price: Math.round(Number(unit.price) * 0.97), label: 'Grosir (≥ 5)' },
          { minQuantity: 20, price: Math.round(Number(unit.price) * 0.95), label: 'Partai Besar (≥ 20)' },
        ]);
      }
    }
  };

  const handleUnitChange = (uId: number) => {
    setSelectedUnitId(uId);
    const prod = products.find((p) => p.id === selectedUnitProduct);
    const unit = prod?.units.find((u) => u.id === uId);
    if (unit && unit.priceTiers && unit.priceTiers.length > 0) {
      setTierInputs(
        unit.priceTiers.map((t) => ({
          minQuantity: Number(t.minQuantity),
          price: Number(t.price),
          label: t.label || '',
        }))
      );
    } else if (unit) {
      setTierInputs([
        { minQuantity: 5, price: Math.round(Number(unit.price) * 0.97), label: 'Grosir (≥ 5)' },
        { minQuantity: 20, price: Math.round(Number(unit.price) * 0.95), label: 'Partai Besar (≥ 20)' },
      ]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Navigation Tabs */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
            <Tag className="w-7 h-7 text-brand-600" />
            Promosi, Diskon Bertingkat & Paket Bundling
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Konfigurasi voucher promo, diskon kuantitas grosir (volume tier), dan paket sembako hemat.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-surface-muted border border-surface-border rounded-lg">
          <button
            onClick={() => setActiveTab('promotions')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'promotions'
                ? 'bg-white text-ink shadow-xs'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            Voucher Promosi
          </button>
          <button
            onClick={() => setActiveTab('bundles')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'bundles'
                ? 'bg-white text-ink shadow-xs'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            Paket Bundling Sembako
          </button>
          <button
            onClick={() => setActiveTab('tiers')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'tiers'
                ? 'bg-white text-ink shadow-xs'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            Diskon Bertingkat (Volume Tier)
          </button>
        </div>
      </div>

      {/* TAB 1: VOUCHER PROMOSI */}
      {activeTab === 'promotions' && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Percent className="w-5 h-5 text-brand-600" />
                  Daftar Voucher & Kupon Promosi Toko
                </CardTitle>
                <p className="text-xs text-ink-muted mt-0.5">
                  Kupon diskon yang dapat dimasukkan kasir pada saat checkout POS.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative w-56">
                  <Search className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    type="text"
                    placeholder="Cari kode promo..."
                    value={promoSearch}
                    onChange={(e) => setPromoSearch(e.target.value)}
                    className="pl-9 h-9 text-xs"
                  />
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleOpenCreatePromo}
                  className="flex items-center gap-1.5 shrink-0 bg-brand-600 hover:bg-brand-700 text-white"
                >
                  <Plus className="w-4 h-4" />
                  Tambah Promo
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-surface-border bg-surface-muted/40 text-[11px] font-semibold text-ink-muted uppercase tracking-wider">
                      <th className="py-3 px-4">Kode Kupon</th>
                      <th className="py-3 px-4">Nama Promosi & Ket</th>
                      <th className="py-3 px-4 text-center">Tipe & Nilai</th>
                      <th className="py-3 px-4 text-right">Min. Belanja</th>
                      <th className="py-3 px-4 text-center">Pemakaian</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-center w-24">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border text-xs">
                    {isLoadingPromos ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-ink-muted">
                          Memuat data kupon promosi...
                        </td>
                      </tr>
                    ) : !promoData?.promotions || promoData.promotions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-ink-muted">
                          Belum ada kupon promosi. Klik "Tambah Promo" untuk membuat kupon baru.
                        </td>
                      </tr>
                    ) : (
                      promoData.promotions.map((p) => (
                        <tr key={p.id} className="hover:bg-surface-muted/30 transition-colors">
                          <td className="py-3 px-4">
                            <span className="font-mono font-bold text-xs bg-brand-50 text-brand-700 px-2.5 py-1 rounded border border-brand-200">
                              {p.code}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-ink">{p.name}</div>
                            {p.description && (
                              <div className="text-[11px] text-ink-muted line-clamp-1">{p.description}</div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {p.type === 'PERCENTAGE' ? (
                              <Badge variant="success">
                                {Number(p.value)}% {p.maxDiscount ? `(Maks ${formatRupiah(p.maxDiscount)})` : ''}
                              </Badge>
                            ) : (
                              <Badge variant="info">Potongan {formatRupiah(p.value)}</Badge>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-ink">
                            {formatRupiah(p.minPurchase)}
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-[11px]">
                            {p.usedCount} / {p.quota ? `${p.quota}x` : '∞'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {p.isActive ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" />
                                Aktif
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                                <XCircle className="w-3 h-3" />
                                Nonaktif
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleOpenEditPromo(p)}
                                className="p-1.5 text-ink-muted hover:text-brand-600 rounded hover:bg-surface-muted transition-colors"
                                title="Edit Promo"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Hapus kupon "${p.code}"?`)) {
                                    deletePromoMutation.mutate(p.id);
                                  }
                                }}
                                className="p-1.5 text-ink-muted hover:text-rose-600 rounded hover:bg-surface-muted transition-colors"
                                title="Hapus Promo"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
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
      )}

      {/* TAB 2: PAKET BUNDLING SEMBAKO */}
      {activeTab === 'bundles' && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Gift className="w-5 h-5 text-emerald-600" />
                  Daftar Paket Bundling Sembako (Combo Package)
                </CardTitle>
                <p className="text-xs text-ink-muted mt-0.5">
                  Paket sembako hemat yang tersusun dari beberapa komponen barang. Saat dijual, stok barang komponen otomatis terpotong secara akurat.
                </p>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setSelectedBundleProduct(null);
                  setBundleComponents([]);
                  setIsBundleModalOpen(true);
                }}
                className="flex items-center gap-1.5 shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Plus className="w-4 h-4" />
                Konfigurasi Paket Baru
              </Button>
            </CardHeader>

            <CardContent className="p-4">
              {isLoadingBundles ? (
                <div className="py-8 text-center text-ink-muted text-xs">Memuat daftar paket bundling...</div>
              ) : !bundleList || bundleList.length === 0 ? (
                <div className="py-8 text-center text-ink-muted text-xs">
                  Belum ada produk yang dikonfigurasi sebagai paket bundling. Klik tombol di atas untuk membuat paket.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {bundleList.map((bundle) => {
                    const price = bundle.units?.[0]?.price ?? 0;
                    return (
                      <Card key={bundle.id} className="p-4 border border-surface-border bg-white flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                <Sparkles className="w-3 h-3 text-emerald-600" />
                                Paket Sembako
                              </span>
                              <h3 className="font-bold text-sm text-ink mt-1.5">{bundle.name}</h3>
                              <p className="text-[11px] font-mono text-ink-muted">{bundle.sku}</p>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-black text-brand-700">{formatRupiah(price)}</div>
                              <div className="text-[10px] text-ink-muted">Modal: {formatRupiah(bundle.totalComponentHpp)}</div>
                            </div>
                          </div>

                          <div className="mt-3 pt-3 border-t border-surface-border/60">
                            <div className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider mb-2">
                              Komponen Paket Penyusun:
                            </div>
                            <div className="space-y-1.5">
                              {bundle.bundleParents.map((item) => (
                                <div
                                  key={item.id}
                                  className="flex items-center justify-between text-xs p-2 rounded bg-surface-muted/40"
                                >
                                  <div>
                                    <span className="font-semibold text-ink">{item.componentProduct?.name}</span>
                                    <span className="text-ink-muted ml-1 text-[11px]">
                                      ({formatNumber(item.quantity)} {item.componentProduct?.baseUnit})
                                    </span>
                                  </div>
                                  <span className="text-[11px] text-ink-muted">
                                    Stok: {formatNumber(item.componentProduct?.currentStock ?? 0)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-surface-border flex items-center justify-between">
                          <div className="text-xs">
                            <span className="text-ink-muted">Siap dirakit:</span>{' '}
                            <span className="font-bold text-emerald-700">
                              {formatNumber(bundle.calculatedAvailableStock)} paket
                            </span>
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedBundleProduct(bundle.id);
                              setBundleComponents(
                                bundle.bundleParents.map((b) => ({
                                  componentProductId: b.componentProductId,
                                  quantity: Number(b.quantity),
                                }))
                              );
                              setIsBundleModalOpen(true);
                            }}
                            className="text-xs h-7 text-ink-muted hover:text-ink"
                          >
                            Atur Komponen
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 3: DISKON BERTINGKAT (VOLUME TIER) */}
      {activeTab === 'tiers' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left panel: Product & Unit Selector */}
          <Card className="lg:col-span-1 p-5 bg-white">
            <CardHeader className="p-0 mb-4">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Layers className="w-4 h-4 text-brand-600" />
                Pilih Produk Grosir
              </CardTitle>
              <p className="text-xs text-ink-muted mt-1">
                Pilih komoditas sembako dan satuan kemasan (misal: Dus, Sak, Karung) yang ingin diatur diskon bertingkatnya.
              </p>
            </CardHeader>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">Produk Sembako</label>
                <select
                  value={selectedUnitProduct || ''}
                  onChange={(e) => handleSelectProductForTiers(Number(e.target.value))}
                  className="w-full text-xs p-2 rounded-md border border-surface-border bg-white text-ink focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  <option value="">-- Pilih Barang Sembako --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>

              {selectedUnitProduct && (
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">Satuan Kemasan Jual</label>
                  <select
                    value={selectedUnitId || ''}
                    onChange={(e) => handleUnitChange(Number(e.target.value))}
                    className="w-full text-xs p-2 rounded-md border border-surface-border bg-white text-ink focus:outline-none focus:ring-1 focus:ring-brand-500"
                  >
                    {products
                      .find((p) => p.id === selectedUnitProduct)
                      ?.units.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.unitName} - Harga Standar: {formatRupiah(u.price)}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div className="p-3 rounded-lg bg-brand-50/60 border border-brand-200/50 flex items-start gap-2">
                <Info className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-brand-800 leading-relaxed">
                  Diskon bertingkat akan diterapkan secara otomatis di kasir POS ketika jumlah pembelian mencapai batas minimal tier.
                </p>
              </div>
            </div>
          </Card>

          {/* Right panel: Tier Editor */}
          <Card className="lg:col-span-2 p-5 bg-white">
            <CardHeader className="p-0 mb-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-emerald-600" />
                  Konfigurasi Skema Tier Harga Grosir
                </CardTitle>
                <p className="text-xs text-ink-muted mt-0.5">
                  Tentukan kuantitas minimal dan harga diskon per satuan.
                </p>
              </div>

              {selectedUnitId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setTierInputs([
                      ...tierInputs,
                      { minQuantity: 10, price: 0, label: 'Grosir Tambahan' },
                    ])
                  }
                  className="text-xs h-8 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tambah Tingkatan (Tier)
                </Button>
              )}
            </CardHeader>

            {!selectedUnitId ? (
              <div className="py-12 text-center text-ink-muted text-xs">
                Silakan pilih produk dan satuan di sebelah kiri untuk melihat atau mengedit tingkat diskon harga.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-3">
                  {tierInputs.map((tier, idx) => (
                    <div
                      key={idx}
                      className="p-3 border border-surface-border rounded-lg bg-surface-muted/30 flex flex-col sm:flex-row sm:items-center gap-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center shrink-0">
                        T{idx + 1}
                      </div>

                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[10px] font-semibold text-ink-muted uppercase">Label Tingkat</label>
                          <Input
                            type="text"
                            value={tier.label}
                            onChange={(e) => {
                              const updated = [...tierInputs];
                              updated[idx].label = e.target.value;
                              setTierInputs(updated);
                            }}
                            className="h-8 text-xs mt-0.5"
                            placeholder="Grosir Sedang"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-ink-muted uppercase">Minimal Qty Beli</label>
                          <Input
                            type="number"
                            value={tier.minQuantity}
                            onChange={(e) => {
                              const updated = [...tierInputs];
                              updated[idx].minQuantity = Number(e.target.value);
                              setTierInputs(updated);
                            }}
                            className="h-8 text-xs mt-0.5"
                            min="2"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-ink-muted uppercase">Harga Khusus Tier (Rp)</label>
                          <Input
                            type="number"
                            value={tier.price}
                            onChange={(e) => {
                              const updated = [...tierInputs];
                              updated[idx].price = Number(e.target.value);
                              setTierInputs(updated);
                            }}
                            className="h-8 text-xs mt-0.5"
                            min="0"
                          />
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          const updated = tierInputs.filter((_, i) => i !== idx);
                          setTierInputs(updated);
                        }}
                        className="p-1.5 text-ink-muted hover:text-rose-600 rounded shrink-0 self-center"
                        title="Hapus Tier"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-surface-border flex justify-end">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => saveTiersMutation.mutate()}
                    disabled={saveTiersMutation.isPending}
                    className="bg-brand-600 hover:bg-brand-700 text-white"
                  >
                    {saveTiersMutation.isPending ? 'Menyimpan...' : 'Simpan Skema Diskon Bertingkat'}
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* MODAL: CREATE / EDIT PROMOTION */}
      <Modal
        isOpen={isPromoModalOpen}
        onClose={() => setIsPromoModalOpen(false)}
        title={editingPromo ? 'Edit Kupon Promosi' : 'Buat Voucher Promosi Baru'}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">Kode Voucher</label>
              <Input
                type="text"
                placeholder="MISAL: JUMATBERKAH"
                value={promoForm.code}
                onChange={(e) => setPromoForm({ ...promoForm, code: e.target.value.toUpperCase() })}
                className="font-mono uppercase font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">Tipe Diskon</label>
              <select
                value={promoForm.type}
                onChange={(e) => setPromoForm({ ...promoForm, type: e.target.value as any })}
                className="w-full text-xs p-2 rounded-md border border-surface-border bg-white text-ink h-9"
              >
                <option value="PERCENTAGE">Persentase (%)</option>
                <option value="FIXED">Potongan Tetap (Rp)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink mb-1">Nama Promosi</label>
            <Input
              type="text"
              placeholder="Contoh: Diskon Sembako Berkah 5%"
              value={promoForm.name}
              onChange={(e) => setPromoForm({ ...promoForm, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">
                {promoForm.type === 'PERCENTAGE' ? 'Nilai Diskon (%)' : 'Potongan Harga (Rp)'}
              </label>
              <Input
                type="number"
                value={promoForm.value}
                onChange={(e) => setPromoForm({ ...promoForm, value: Number(e.target.value) })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink mb-1">Minimal Belanja (Rp)</label>
              <Input
                type="number"
                value={promoForm.minPurchase}
                onChange={(e) => setPromoForm({ ...promoForm, minPurchase: Number(e.target.value) })}
              />
            </div>
          </div>

          {promoForm.type === 'PERCENTAGE' && (
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">Plafon Maksimal Diskon (Rp)</label>
              <Input
                type="number"
                placeholder="Batas maksimal potongan diskon"
                value={promoForm.maxDiscount}
                onChange={(e) => setPromoForm({ ...promoForm, maxDiscount: Number(e.target.value) })}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">Kuota Pemakaian</label>
              <Input
                type="number"
                placeholder="Batas kuota total"
                value={promoForm.quota}
                onChange={(e) => setPromoForm({ ...promoForm, quota: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">Status Kupon</label>
              <select
                value={promoForm.isActive ? 'true' : 'false'}
                onChange={(e) => setPromoForm({ ...promoForm, isActive: e.target.value === 'true' })}
                className="w-full text-xs p-2 rounded-md border border-surface-border bg-white text-ink h-9"
              >
                <option value="true">Aktif</option>
                <option value="false">Nonaktif</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink mb-1">Keterangan / Catatan</label>
            <Input
              type="text"
              placeholder="Deskripsi singkat syarat & ketentuan"
              value={promoForm.description}
              onChange={(e) => setPromoForm({ ...promoForm, description: e.target.value })}
            />
          </div>

          <div className="pt-3 border-t border-surface-border flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsPromoModalOpen(false)}>
              Batal
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => savePromoMutation.mutate()}
              disabled={savePromoMutation.isPending || !promoForm.code || !promoForm.name}
              className="bg-brand-600 hover:bg-brand-700 text-white"
            >
              {savePromoMutation.isPending ? 'Menyimpan...' : 'Simpan Kupon'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL: CONFIGURE BUNDLE COMPONENTS */}
      <Modal
        isOpen={isBundleModalOpen}
        onClose={() => setIsBundleModalOpen(false)}
        title="Konfigurasi Komponen Paket Bundling Sembako"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink mb-1">Pilih Produk Paket</label>
            <select
              value={selectedBundleProduct || ''}
              onChange={(e) => setSelectedBundleProduct(Number(e.target.value))}
              className="w-full text-xs p-2 rounded-md border border-surface-border bg-white text-ink h-9"
            >
              <option value="">-- Pilih Produk Induk Paket --</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
          </div>

          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-ink">Komponen Bahan Penyusun:</label>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setBundleComponents([
                    ...bundleComponents,
                    { componentProductId: products[0]?.id || 0, quantity: 1 },
                  ])
                }
                className="text-xs h-7 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Bahan
              </Button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {bundleComponents.map((comp, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 rounded bg-surface-muted/40 border border-surface-border">
                  <select
                    value={comp.componentProductId}
                    onChange={(e) => {
                      const updated = [...bundleComponents];
                      updated[idx].componentProductId = Number(e.target.value);
                      setBundleComponents(updated);
                    }}
                    className="flex-1 text-xs p-1.5 rounded border border-surface-border bg-white"
                  >
                    {products
                      .filter((p) => p.id !== selectedBundleProduct)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.baseUnit})
                        </option>
                      ))}
                  </select>

                  <div className="w-24">
                    <Input
                      type="number"
                      placeholder="Qty dasar"
                      value={comp.quantity}
                      onChange={(e) => {
                        const updated = [...bundleComponents];
                        updated[idx].quantity = Number(e.target.value);
                        setBundleComponents(updated);
                      }}
                      className="h-8 text-xs"
                      min="1"
                    />
                  </div>

                  <button
                    onClick={() => {
                      setBundleComponents(bundleComponents.filter((_, i) => i !== idx));
                    }}
                    className="p-1.5 text-ink-muted hover:text-rose-600 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-surface-border flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsBundleModalOpen(false)}>
              Batal
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => saveBundleMutation.mutate()}
              disabled={saveBundleMutation.isPending || !selectedBundleProduct || bundleComponents.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {saveBundleMutation.isPending ? 'Menyimpan...' : 'Simpan Komponen Paket'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PromotionsPage;
