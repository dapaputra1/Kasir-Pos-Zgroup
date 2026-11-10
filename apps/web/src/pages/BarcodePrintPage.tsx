import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Barcode,
  Printer,
  Tag,
  Layers,
  Search,
  Sparkles,
  PackagePlus,
  Edit3,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { ProductFormModal } from '../components/products/ProductFormModal';
import { useToast } from '../components/ui/Toast';
import { api } from '../lib/api';
import { formatRupiah } from '../lib/utils';
import { Product } from '../types/product';
import { Category } from '../types/category';
import { StoreSetting } from '../types/setting';

// Vector SVG Barcode Generator (Code 128 simulator with crisp bars)
const BarcodeSvg: React.FC<{ code: string; height?: number }> = ({ code, height = 40 }) => {
  const bars: { width: number; isBlack: boolean }[] = [];
  let isBlack = true;

  bars.push({ width: 3, isBlack: false });
  bars.push({ width: 2, isBlack: true });
  bars.push({ width: 1, isBlack: false });
  bars.push({ width: 2, isBlack: true });

  const safeCode = code && code.trim().length > 0 ? code.trim() : '00000000';

  for (let i = 0; i < safeCode.length; i++) {
    const val = safeCode.charCodeAt(i);
    const pattern = [(val % 3) + 1, ((val >> 2) % 3) + 1, ((val >> 4) % 2) + 1, (val % 2) + 1];
    for (const w of pattern) {
      bars.push({ width: w, isBlack });
      isBlack = !isBlack;
    }
  }

  bars.push({ width: 2, isBlack: true });
  bars.push({ width: 1, isBlack: false });
  bars.push({ width: 3, isBlack: true });
  bars.push({ width: 3, isBlack: false });

  let currentX = 0;

  return (
    <svg className="h-10 w-full max-w-[200px] mx-auto" viewBox="0 0 200 40" preserveAspectRatio="none">
      {bars.map((bar, idx) => {
        const x = currentX;
        currentX += bar.width * 2.2;
        if (!bar.isBlack) return null;
        return <rect key={idx} x={x} y={0} width={bar.width * 2} height={height} fill="#000" />;
      })}
    </svg>
  );
};

export const BarcodePrintPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  const [printMode, setPrintMode] = useState<'label' | 'shelf'>('label');
  const [sourceType, setSourceType] = useState<'catalog' | 'manual'>('catalog');

  // Catalog State
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [selectedUnitName, setSelectedUnitName] = useState<string>('');
  const [copies, setCopies] = useState<number>(8);

  // Manual / Repack Kilat State
  const [manualName, setManualName] = useState('Gula Pasir Kristal Repack');
  const [manualBarcode, setManualBarcode] = useState('202410200001');
  const [manualPrice, setManualPrice] = useState<number>(17500);
  const [manualWholesalePrice, setManualWholesalePrice] = useState<number>(16500);
  const [manualUnit, setManualUnit] = useState('1 KG');

  // Modal Create Product state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // 1. Fetch Store Settings
  const { data: storeSetting } = useQuery<StoreSetting>({
    queryKey: ['store-settings'],
    queryFn: async () => {
      const res = await api.get('/settings');
      return res.data.data;
    },
  });

  // 2. Fetch Products
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products-for-barcode'],
    queryFn: async () => {
      const res = await api.get('/products?limit=150');
      return res.data.data;
    },
  });

  // 3. Fetch Categories for Create Product Modal
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get('/categories');
      return res.data.data;
    },
  });

  // 4. Create Product Mutation
  const createProductMutation = useMutation({
    mutationFn: async (formData: any) => {
      const res = await api.post('/products', formData);
      return res.data.data;
    },
    onSuccess: (newProduct) => {
      success('Produk baru berhasil disimpan ke katalog dan siap dicetak labelnya!');
      queryClient.invalidateQueries({ queryKey: ['products-for-barcode'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['pos-catalog'] });
      setSelectedProductId(newProduct.id);
      setIsCreateModalOpen(false);
    },
    onError: (err: any) => {
      toastError(err.message || 'Gagal menyimpan produk baru.');
    },
  });

  // Filtered Products for quick lookup
  const filteredProducts = useMemo(() => {
    if (!searchFilter.trim()) return products;
    const q = searchFilter.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.barcode && p.barcode.toLowerCase().includes(q))
    );
  }, [products, searchFilter]);

  const selectedProduct = useMemo(() => {
    if (selectedProductId) {
      const found = products.find((p) => p.id === selectedProductId);
      if (found) return found;
    }
    return filteredProducts[0] || products[0];
  }, [products, filteredProducts, selectedProductId]);

  // Set default selected unit when product changes
  React.useEffect(() => {
    if (selectedProduct && selectedProduct.units && selectedProduct.units.length > 0) {
      const base = selectedProduct.units.find((u) => u.isBaseUnit) || selectedProduct.units[0];
      setSelectedUnitName(base.unitName);
    }
  }, [selectedProduct]);

  const activeUnit =
    selectedProduct?.units?.find((u) => u.unitName === selectedUnitName) ||
    selectedProduct?.units?.[0];

  const wholesaleUnit = selectedProduct?.units?.find(
    (u) => !u.isBaseUnit && u.wholesalePrice && Number(u.wholesalePrice) > 0
  );

  // Derived label content based on catalog vs manual
  const displayStoreName = storeSetting?.storeName || 'GrosirPOS Sembako';
  const displayName = sourceType === 'catalog' ? selectedProduct?.name || 'Pilih Produk' : manualName;
  const displayUnit = sourceType === 'catalog' ? activeUnit?.unitName || selectedProduct?.baseUnit || 'PCS' : manualUnit;
  const displayBarcode =
    sourceType === 'catalog'
      ? activeUnit?.barcode || selectedProduct?.barcode || selectedProduct?.sku || '00000000'
      : manualBarcode;
  const displayPrice = sourceType === 'catalog' ? Number(activeUnit?.price || 0) : manualPrice;
  const displayWholesalePrice =
    sourceType === 'catalog'
      ? Number(wholesaleUnit?.wholesalePrice || 0)
      : manualWholesalePrice;
  const displaySku = sourceType === 'catalog' ? selectedProduct?.sku || '' : 'REPACK-KILAT';

  // Helper to generate a random 12-digit barcode for repack sembako
  const generateRandomBarcode = () => {
    const random12 = '20' + Math.floor(1000000000 + Math.random() * 9000000000).toString();
    setManualBarcode(random12);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Page Header (Hidden on Print) */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
            <Barcode className="w-7 h-7 text-brand-600" />
            Cetak Label Barcode & Price Tag Rak
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Cetak stiker barcode kemasan repack sembako & label display harga rak toko (eceran & grosir).
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsCreateModalOpen(true)}
            leftIcon={<PackagePlus className="w-4 h-4 text-brand-600" />}
            className="border-brand-200 text-brand-700 hover:bg-brand-50"
          >
            + Tambah Produk ke Katalog
          </Button>

          <Button
            variant="primary"
            onClick={handlePrint}
            className="flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Cetak Sekarang (Print)
          </Button>
        </div>
      </div>

      {/* Control Configuration Card (Hidden on Print) */}
      <Card className="p-5 bg-white print:hidden space-y-4 shadow-xs border-surface-border">
        {/* Source Mode Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-surface-border gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-ink uppercase tracking-wider">
              Sumber Data:
            </span>
            <div className="inline-flex rounded-lg border border-surface-border p-1 bg-surface-muted">
              <button
                type="button"
                onClick={() => setSourceType('catalog')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                  sourceType === 'catalog'
                    ? 'bg-brand-500 text-white shadow-xs'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                Pilih dari Katalog Toko
              </button>
              <button
                type="button"
                onClick={() => setSourceType('manual')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors flex items-center gap-1.5 ${
                  sourceType === 'manual'
                    ? 'bg-brand-500 text-white shadow-xs'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                Ketik Manual / Repack Kilat
              </button>
            </div>
          </div>

          {/* Print Format Tabs */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-ink uppercase tracking-wider">
              Format:
            </span>
            <div className="inline-flex rounded-lg border border-surface-border p-1 bg-surface-muted">
              <button
                type="button"
                onClick={() => setPrintMode('label')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors flex items-center gap-1.5 ${
                  printMode === 'label'
                    ? 'bg-brand-500 text-white shadow-xs'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                <Tag className="w-3.5 h-3.5" />
                Stiker Barcode
              </button>
              <button
                type="button"
                onClick={() => setPrintMode('shelf')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors flex items-center gap-1.5 ${
                  printMode === 'shelf'
                    ? 'bg-brand-500 text-white shadow-xs'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Price Tag Rak
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Controls Based on Source */}
        {sourceType === 'catalog' ? (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
            {/* Search Filter */}
            <div className="md:col-span-4">
              <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
                Cari Produk
              </label>
              <Input
                placeholder="Ketik nama atau SKU..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                prefixElement={<Search className="w-4 h-4 text-ink-muted" />}
              />
            </div>

            {/* Select Product */}
            <div className="md:col-span-4">
              <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
                Pilih Produk ({filteredProducts.length} Barang)
              </label>
              <Select
                value={selectedProduct ? String(selectedProduct.id) : ''}
                onChange={(e) => setSelectedProductId(Number(e.target.value))}
                options={filteredProducts.map((p) => ({
                  value: String(p.id),
                  label: `${p.name} (${p.sku})`,
                }))}
              />
            </div>

            {/* Packaging Unit Selector (if multi-unit) */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
                Satuan Kemasan
              </label>
              <Select
                value={selectedUnitName}
                onChange={(e) => setSelectedUnitName(e.target.value)}
                options={
                  selectedProduct?.units?.map((u) => ({
                    value: u.unitName,
                    label: `${u.unitName} (${formatRupiah(u.price)})`,
                  })) || [{ value: 'PCS', label: 'PCS' }]
                }
              />
            </div>

            {/* Number of Copies */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
                Jumlah Lembar
              </label>
              <Input
                type="number"
                min="1"
                max="120"
                value={copies}
                onChange={(e) => setCopies(Math.max(1, Number(e.target.value)))}
                className="font-bold text-center"
              />
            </div>
          </div>
        ) : (
          /* Manual / Repack Kilat Inputs */
          <div className="space-y-3">
            <div className="p-3 bg-brand-50 border border-brand-200 rounded-lg text-xs text-brand-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-600 shrink-0" />
                <span>
                  <strong>Mode Repack Kilat:</strong> Buat dan cetak stiker barcode instan untuk beras karungan, gula pasir curah, atau telur tanpa perlu mendaftarkannya terlebih dahulu ke katalog.
                </span>
              </div>
              <button
                type="button"
                onClick={generateRandomBarcode}
                className="px-2.5 py-1 bg-white hover:bg-brand-100 border border-brand-200 text-brand-700 font-bold rounded text-[11px] shrink-0"
              >
                Generate Barcode Acak
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="lg:col-span-2">
                <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
                  Nama Barang Repack
                </label>
                <Input
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="Contoh: Beras Rojo Lele Repack 5kg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
                  Kode Barcode (Angka)
                </label>
                <Input
                  value={manualBarcode}
                  onChange={(e) => setManualBarcode(e.target.value)}
                  placeholder="202410200001"
                  className="font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
                  Harga Jual (Rp)
                </label>
                <Input
                  type="number"
                  min="0"
                  value={manualPrice}
                  onChange={(e) => setManualPrice(Number(e.target.value))}
                  className="font-bold"
                />
              </div>

              {printMode === 'shelf' && (
                <div>
                  <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
                    Harga Grosir (Opsional)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={manualWholesalePrice}
                    onChange={(e) => setManualWholesalePrice(Number(e.target.value))}
                    className="font-bold"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
                  Satuan & Jumlah
                </label>
                <div className="flex gap-2">
                  <Input
                    value={manualUnit}
                    onChange={(e) => setManualUnit(e.target.value.toUpperCase())}
                    placeholder="1 KG / 5 KG"
                    className="w-24 text-center font-bold"
                  />
                  <Input
                    type="number"
                    min="1"
                    max="120"
                    value={copies}
                    onChange={(e) => setCopies(Math.max(1, Number(e.target.value)))}
                    className="w-16 font-bold text-center"
                    title="Jumlah Salinan Cetak"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* PRINT CANVAS PREVIEW AREA */}
      <div>
        <div className="mb-2.5 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-ink uppercase tracking-wider">
              Pratinjau Lembar Cetak ({copies} Lembar):
            </span>
            <span className="text-xs text-brand-600 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded font-semibold">
              {printMode === 'label' ? 'Stiker Barcode Kemasan' : 'Price Tag Rak Toko'}
            </span>
          </div>
          <span className="text-xs text-ink-muted hidden sm:inline">
            Desain siap cetak di kertas stiker Tom & Jerry, thermal barcode printer, maupun kertas HVS.
          </span>
        </div>

        {/* PRINT CONTAINER WITH PRINT MEDIA STYLING */}
        <div className="bg-slate-100 p-6 rounded-xl border border-surface-border min-h-[400px] print:p-0 print:bg-white print:border-none">
          {printMode === 'label' ? (
            /* 1. STIKER BARCODE KEMASAN / REPACK */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 print:grid-cols-3 print:gap-3">
              {Array.from({ length: copies }).map((_, idx) => (
                <div
                  key={idx}
                  className="bg-white border-2 border-dashed border-gray-300 print:border print:border-solid print:border-gray-800 rounded-lg p-3 text-center flex flex-col justify-between shadow-xs print:shadow-none min-h-[145px]"
                >
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest truncate">
                    {displayStoreName}
                  </div>

                  <div className="my-1">
                    <div className="font-black text-xs text-ink truncate uppercase">
                      {displayName}
                    </div>
                    <div className="text-[10px] text-ink-muted font-semibold">
                      Satuan: {displayUnit}
                    </div>
                  </div>

                  {/* Barcode Graphic */}
                  <div className="my-1">
                    <BarcodeSvg code={displayBarcode} height={32} />
                    <div className="font-mono text-[10px] tracking-widest text-ink font-semibold mt-0.5">
                      {displayBarcode}
                    </div>
                  </div>

                  <div className="pt-1.5 border-t border-gray-200 flex items-center justify-between">
                    <span className="text-[9px] text-gray-400 uppercase font-bold">Harga:</span>
                    <span className="text-sm font-black text-ink font-mono tabular-nums">
                      {formatRupiah(displayPrice)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* 2. PRICE TAG RAK TOKO GROSIR */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 print:grid-cols-2 print:gap-4">
              {Array.from({ length: copies }).map((_, idx) => (
                <div
                  key={idx}
                  className="bg-white border-2 border-gray-900 rounded-xl p-4 flex flex-col justify-between shadow-xs print:shadow-none min-h-[175px]"
                >
                  {/* Shelf Tag Header */}
                  <div className="flex items-center justify-between pb-1.5 border-b border-gray-900">
                    <span className="text-[10px] font-black uppercase tracking-wider text-brand-700">
                      {displayStoreName}
                    </span>
                    <span className="text-[9px] font-mono text-gray-500 font-semibold">
                      {displaySku}
                    </span>
                  </div>

                  {/* Product Name */}
                  <div className="my-2">
                    <h3 className="font-black text-sm text-ink leading-snug line-clamp-2 uppercase">
                      {displayName}
                    </h3>
                  </div>

                  {/* Retail vs Wholesale Dual Price Display */}
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 my-1">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">
                        Harga Ecer ({displayUnit}):
                      </span>
                      <span className="text-lg font-black text-ink font-mono tabular-nums">
                        {formatRupiah(displayPrice)}
                      </span>
                    </div>

                    {displayWholesalePrice > 0 && (
                      <div className="mt-1 pt-1 border-t border-dashed border-slate-300 flex items-baseline justify-between text-brand-800">
                        <span className="text-[10px] font-bold uppercase">
                          Grosir / Dus / Lusin:
                        </span>
                        <span className="text-sm font-black font-mono tabular-nums">
                          {formatRupiah(displayWholesalePrice)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Barcode & Shelf Tag Footer */}
                  <div className="pt-1.5 flex items-center justify-between">
                    <div className="w-28">
                      <BarcodeSvg code={displayBarcode} height={20} />
                    </div>
                    <div className="text-right font-mono text-[9px] text-gray-500 font-medium">
                      <div className="font-bold text-ink">{displayBarcode}</div>
                      <div>Cetak: {new Date().toLocaleDateString('id-ID')}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* POPUP MODAL TAMBAH PRODUK KE KATALOG */}
      <ProductFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        categories={categories}
        onSubmit={async (data) => {
          await createProductMutation.mutateAsync(data);
        }}
        isLoading={createProductMutation.isPending}
      />
    </div>
  );
};

export default BarcodePrintPage;
