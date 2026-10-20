import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Barcode,
  Printer,
  Tag,
  Layers,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { api } from '../lib/api';
import { formatRupiah } from '../lib/utils';
import { Product } from '../types/product';
import { StoreSetting } from '../types/setting';

// Simple SVG Barcode Generator (Code 128 pattern simulator / vector bars)
const BarcodeSvg: React.FC<{ code: string; height?: number }> = ({ code, height = 40 }) => {
  // Deterministic bar widths based on char codes for realistic sharp barcode rendering
  const bars: { width: number; isBlack: boolean }[] = [];
  let isBlack = true;

  // Guard quiet zone
  bars.push({ width: 3, isBlack: false });
  bars.push({ width: 2, isBlack: true });
  bars.push({ width: 1, isBlack: false });
  bars.push({ width: 2, isBlack: true });

  for (let i = 0; i < code.length; i++) {
    const val = code.charCodeAt(i);
    const pattern = [(val % 3) + 1, ((val >> 2) % 3) + 1, ((val >> 4) % 2) + 1, (val % 2) + 1];
    for (const w of pattern) {
      bars.push({ width: w, isBlack });
      isBlack = !isBlack;
    }
  }

  // Stop pattern
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
  const [printMode, setPrintMode] = useState<'label' | 'shelf'>('label');
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [copies, setCopies] = useState<number>(8);
  const [selectedUnitName, setSelectedUnitName] = useState<string>('');

  // Fetch store settings for store name
  const { data: storeSetting } = useQuery<StoreSetting>({
    queryKey: ['store-settings'],
    queryFn: async () => {
      const res = await api.get('/settings');
      return res.data.data;
    },
  });

  // Fetch products
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products-for-barcode'],
    queryFn: async () => {
      const res = await api.get('/products?limit=100');
      return res.data.data;
    },
  });

  const selectedProduct = products.find((p) => p.id === selectedProductId) || products[0];

  // Set default selected unit when product changes
  React.useEffect(() => {
    if (selectedProduct && selectedProduct.units.length > 0) {
      const base = selectedProduct.units.find((u) => u.isBaseUnit) || selectedProduct.units[0];
      setSelectedUnitName(base.unitName);
    }
  }, [selectedProduct]);

  const activeUnit = selectedProduct?.units.find((u) => u.unitName === selectedUnitName) || selectedProduct?.units[0];
  const wholesaleUnit = selectedProduct?.units.find((u) => !u.isBaseUnit && u.wholesalePrice);

  const barcodeValue = activeUnit?.barcode || selectedProduct?.barcode || selectedProduct?.sku || '00000000';

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
            Generator stiker barcode untuk barang repack sembako (beras, gula, telur) & label harga rak pajang toko.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            onClick={handlePrint}
            className="flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Cetak Label Sekarang (Print)
          </Button>
        </div>
      </div>

      {/* Control Configuration Card (Hidden on Print) */}
      <Card className="p-5 bg-white print:hidden">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Mode Selector */}
          <div>
            <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
              Tipe Cetakan
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPrintMode('label')}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all ${
                  printMode === 'label'
                    ? 'bg-brand-600 text-white border-brand-600 shadow-xs'
                    : 'bg-white text-ink border-surface-border hover:bg-surface-muted'
                }`}
              >
                <Tag className="w-3.5 h-3.5 mx-auto mb-1" />
                Stiker Barcode
              </button>
              <button
                type="button"
                onClick={() => setPrintMode('shelf')}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all ${
                  printMode === 'shelf'
                    ? 'bg-brand-600 text-white border-brand-600 shadow-xs'
                    : 'bg-white text-ink border-surface-border hover:bg-surface-muted'
                }`}
              >
                <Layers className="w-3.5 h-3.5 mx-auto mb-1" />
                Price Tag Rak
              </button>
            </div>
          </div>

          {/* Select Product */}
          <div className="lg:col-span-2">
            <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
              Pilih Barang Sembako
            </label>
            <Select
              value={selectedProduct ? String(selectedProduct.id) : ''}
              onChange={(e) => setSelectedProductId(Number(e.target.value))}
              options={products.map((p) => ({
                value: String(p.id),
                label: `${p.name} (${p.sku})`,
              }))}
            />
          </div>

          {/* Copies */}
          <div>
            <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
              Jumlah Label Dicetak
            </label>
            <Input
              type="number"
              min="1"
              max="100"
              value={copies}
              onChange={(e) => setCopies(Math.max(1, Number(e.target.value)))}
              className="text-xs h-9 font-bold"
            />
          </div>
        </div>
      </Card>

      {/* PRINT CANVAS PREVIEW AREA */}
      <div>
        <div className="mb-2 flex items-center justify-between print:hidden">
          <span className="text-xs font-bold text-ink uppercase tracking-wider">
            Preview Lembar Cetak ({copies} Lembar):
          </span>
          <span className="text-xs text-ink-muted">
            Ukuran stiker otomatis rapi untuk thermal printer maupun kertas HVS/Label Tom & Jerry.
          </span>
        </div>

        {/* PRINT CONTAINER WITH PRINT MEDIA STYLING */}
        <div className="bg-slate-100 p-6 rounded-xl border border-surface-border min-h-[400px] print:p-0 print:bg-white print:border-none">
          {selectedProduct && printMode === 'label' && (
            /* STIKER BARCODE KEMASAN / REPACK */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 print:grid-cols-3 print:gap-3">
              {Array.from({ length: copies }).map((_, idx) => (
                <div
                  key={idx}
                  className="bg-white border-2 border-dashed border-gray-300 print:border print:border-solid print:border-gray-800 rounded-lg p-3 text-center flex flex-col justify-between shadow-xs print:shadow-none min-h-[140px]"
                >
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest truncate">
                    {storeSetting?.storeName || 'GrosirPOS Sembako'}
                  </div>

                  <div className="my-1">
                    <div className="font-black text-xs text-ink truncate uppercase">
                      {selectedProduct.name}
                    </div>
                    <div className="text-[10px] text-ink-muted font-medium">
                      Satuan: {activeUnit?.unitName || selectedProduct.baseUnit}
                    </div>
                  </div>

                  {/* Barcode Graphic */}
                  <div className="my-1">
                    <BarcodeSvg code={barcodeValue} height={32} />
                    <div className="font-mono text-[10px] tracking-widest text-ink font-semibold mt-0.5">
                      {barcodeValue}
                    </div>
                  </div>

                  <div className="pt-1.5 border-t border-gray-200 flex items-center justify-between">
                    <span className="text-[9px] text-gray-400 uppercase font-bold">Harga:</span>
                    <span className="text-sm font-black text-ink">
                      {formatRupiah(Number(activeUnit?.price || 0))}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedProduct && printMode === 'shelf' && (
            /* PRICE TAG RAK TOKO GROSIR */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 print:grid-cols-2 print:gap-4">
              {Array.from({ length: copies }).map((_, idx) => (
                <div
                  key={idx}
                  className="bg-white border-2 border-gray-900 rounded-xl p-4 flex flex-col justify-between shadow-xs print:shadow-none min-h-[170px]"
                >
                  {/* Shelf Tag Header */}
                  <div className="flex items-center justify-between pb-1.5 border-b border-gray-900">
                    <span className="text-[10px] font-black uppercase tracking-wider text-brand-700">
                      {storeSetting?.storeName || 'GROSIRPOS SEMBAKO'}
                    </span>
                    <span className="text-[9px] font-mono text-gray-500">
                      {selectedProduct.sku}
                    </span>
                  </div>

                  {/* Product Name */}
                  <div className="my-2">
                    <h3 className="font-black text-sm text-ink leading-snug line-clamp-2 uppercase">
                      {selectedProduct.name}
                    </h3>
                  </div>

                  {/* Retail vs Wholesale Dual Price Display */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 my-1">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[10px] font-bold text-gray-500 uppercase">
                        Harga Ecer ({activeUnit?.unitName}):
                      </span>
                      <span className="text-lg font-black text-ink">
                        {formatRupiah(Number(activeUnit?.price || 0))}
                      </span>
                    </div>

                    {wholesaleUnit && (
                      <div className="mt-1 pt-1 border-t border-dashed border-gray-300 flex items-baseline justify-between text-brand-800">
                        <span className="text-[10px] font-bold uppercase">
                          Grosir ({wholesaleUnit.unitName}):
                        </span>
                        <span className="text-sm font-black">
                          {formatRupiah(Number(wholesaleUnit.wholesalePrice || 0))}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Barcode & Shelf Tag Footer */}
                  <div className="pt-1 flex items-center justify-between">
                    <div className="w-28">
                      <BarcodeSvg code={barcodeValue} height={20} />
                    </div>
                    <div className="text-right font-mono text-[9px] text-gray-500">
                      <div>{barcodeValue}</div>
                      <div>Cetak: {new Date().toLocaleDateString('id-ID')}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default BarcodePrintPage;
