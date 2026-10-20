import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, AlertCircle, Truck, CreditCard, Camera } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { BarcodeScannerModal } from '../pos/BarcodeScannerModal';
import { api } from '../../lib/api';
import { formatRupiah, formatNumber } from '../../lib/utils';
import { sound } from '../../lib/sound';
import { Supplier, PurchasePaymentType } from '../../types/supplier';
import { Product } from '../../types/product';

interface PurchaseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface FormItem {
  id: string; // local unique id for list keys
  productId: number;
  productUnitId: number | null;
  quantity: number;
  unitCost: number;
  updateProductCost: boolean;
}

export const PurchaseFormModal: React.FC<PurchaseFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const queryClient = useQueryClient();

  // Form states
  const [supplierId, setSupplierId] = useState<number | ''>('');
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [paymentType, setPaymentType] = useState<PurchasePaymentType>('CASH');
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14); // default tempo 14 days
    return d.toISOString().slice(0, 10);
  });
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [taxAmount, setTaxAmount] = useState<number>(0);
  const [notes, setNotes] = useState('');

  // Items list
  const [items, setItems] = useState<FormItem[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  // Fetch Suppliers
  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ['suppliers-active'],
    queryFn: async () => {
      const res = await api.get('/suppliers?active=true&limit=100');
      return res.data.data;
    },
    enabled: isOpen,
  });

  // Fetch Products
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products-all'],
    queryFn: async () => {
      const res = await api.get('/products?limit=100');
      return res.data.data;
    },
    enabled: isOpen,
  });

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setSupplierId(suppliers[0]?.id || '');
      setSupplierInvoiceNo('');
      setPurchaseDate(new Date().toISOString().slice(0, 10));
      setPaymentType('CASH');
      const d = new Date();
      d.setDate(d.getDate() + 14);
      setDueDate(d.toISOString().slice(0, 10));
      setAmountPaid(0);
      setDiscountAmount(0);
      setTaxAmount(0);
      setNotes('');
      setErrorMsg(null);

      // Initialize with 1 empty item
      if (products.length > 0) {
        const firstProd = products[0];
        const defaultUnit = firstProd.units.find((u) => u.conversionFactor > 1) || firstProd.units[0];
        setItems([
          {
            id: 'item-1',
            productId: firstProd.id,
            productUnitId: defaultUnit?.id || null,
            quantity: 1,
            unitCost: Number(firstProd.purchasePrice) * (defaultUnit?.conversionFactor || 1),
            updateProductCost: true,
          },
        ]);
      } else {
        setItems([]);
      }
    }
  }, [isOpen, suppliers, products]);

  // Handle adding new item row
  const addItemRow = () => {
    if (products.length === 0) return;
    const prod = products[0];
    const defaultUnit = prod.units.find((u) => u.conversionFactor > 1) || prod.units[0];
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}-${Math.random()}`,
        productId: prod.id,
        productUnitId: defaultUnit?.id || null,
        quantity: 1,
        unitCost: Number(prod.purchasePrice) * (defaultUnit?.conversionFactor || 1),
        updateProductCost: true,
      },
    ]);
  };

  // Handle barcode scanned from camera or scanner
  const handleBarcodeScanned = (code: string) => {
    const cleanCode = code.trim();
    if (!cleanCode) return;

    let matchedProd: Product | undefined;
    let matchedUnitId: number | null = null;

    for (const p of products) {
      if (p.barcode && p.barcode.toLowerCase() === cleanCode.toLowerCase()) {
        matchedProd = p;
        const defaultUnit = p.units.find((u) => u.conversionFactor > 1) || p.units[0];
        matchedUnitId = defaultUnit?.id || null;
        break;
      }
      const uMatch = p.units?.find(
        (u) => u.barcode && u.barcode.toLowerCase() === cleanCode.toLowerCase()
      );
      if (uMatch) {
        matchedProd = p;
        matchedUnitId = uMatch.id ?? null;
        break;
      }
    }

    if (!matchedProd) {
      setErrorMsg(`Barang dengan barcode "${cleanCode}" tidak terdaftar di katalog produk.`);
      sound.playScanError();
      return;
    }

    setErrorMsg(null);
    sound.playScanSuccess();

    const selectedUnit = matchedProd.units.find((u) => u.id === matchedUnitId) || matchedProd.units[0];
    const factor = selectedUnit ? selectedUnit.conversionFactor : 1;
    const unitCost = Number(matchedProd.purchasePrice) * factor;

    setItems((prev) => {
      // If there's an existing row with the same product and unit, increment its quantity
      const existingIdx = prev.findIndex(
        (it) => it.productId === matchedProd!.id && it.productUnitId === (selectedUnit?.id || null)
      );

      if (existingIdx >= 0) {
        return prev.map((it, idx) =>
          idx === existingIdx ? { ...it, quantity: Number(it.quantity) + 1 } : it
        );
      }

      const newItem: FormItem = {
        id: `item-${Date.now()}-${Math.random()}`,
        productId: matchedProd!.id,
        productUnitId: selectedUnit?.id || null,
        quantity: 1,
        unitCost,
        updateProductCost: true,
      };

      // If there is only 1 initial item and it hasn't been changed yet, replace it
      if (
        prev.length === 1 &&
        prev[0].quantity === 1 &&
        prev[0].productId === products[0]?.id &&
        !prev[0].productUnitId
      ) {
        return [newItem];
      }

      return [...prev, newItem];
    });

    setIsScanning(false);
  };

  // Handle removing item row
  const removeItemRow = (index: number) => {
    if (items.length <= 1) {
      setErrorMsg('Faktur pembelian minimal harus memiliki 1 barang.');
      return;
    }
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Handle product change in row
  const handleProductChange = (index: number, newProductId: number) => {
    const prod = products.find((p) => p.id === newProductId);
    if (!prod) return;
    const defaultUnit = prod.units.find((u) => u.conversionFactor > 1) || prod.units[0];
    setItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        return {
          ...item,
          productId: newProductId,
          productUnitId: defaultUnit?.id || null,
          unitCost: Number(prod.purchasePrice) * (defaultUnit?.conversionFactor || 1),
        };
      })
    );
  };

  // Handle unit change in row
  const handleUnitChange = (index: number, unitId: number | null) => {
    setItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        const prod = products.find((p) => p.id === item.productId);
        const unit = prod?.units.find((u) => u.id === unitId);
        const factor = unit ? unit.conversionFactor : 1;
        // Recalculate estimated cost based on product base purchasePrice
        const basePrice = Number(prod?.purchasePrice || 0);
        return {
          ...item,
          productUnitId: unitId,
          unitCost: basePrice * factor,
        };
      })
    );
  };

  // Update item field
  const updateItemField = (index: number, field: keyof FormItem, value: any) => {
    setItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        return { ...item, [field]: value };
      })
    );
  };

  // Calculations
  const calculatedSubtotal = items.reduce((acc, item) => {
    return acc + (Number(item.quantity) || 0) * (Number(item.unitCost) || 0);
  }, 0);

  const calculatedTotal = Math.max(0, calculatedSubtotal - (discountAmount || 0) + (taxAmount || 0));

  // Mutation
  const createPurchaseMutation = useMutation({
    mutationFn: async () => {
      if (!supplierId) {
        throw new Error('Pilih supplier terlebih dahulu.');
      }
      if (items.length === 0) {
        throw new Error('Daftar barang tidak boleh kosong.');
      }

      const payload = {
        supplierId: Number(supplierId),
        supplierInvoiceNo: supplierInvoiceNo.trim() || undefined,
        purchaseDate,
        paymentType,
        dueDate: paymentType === 'TEMPO' ? dueDate : undefined,
        amountPaid: paymentType === 'TEMPO' ? amountPaid : calculatedTotal,
        discountAmount,
        taxAmount,
        notes: notes.trim() || undefined,
        items: items.map((it) => ({
          productId: it.productId,
          productUnitId: it.productUnitId || undefined,
          quantity: Number(it.quantity),
          unitCost: Number(it.unitCost),
          updateProductCost: it.updateProductCost,
        })),
      };

      return api.post('/purchases', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['purchases-summary'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products-all'] });
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (err: any) => {
      setErrorMsg(err?.response?.data?.message || err.message || 'Gagal menyimpan transaksi pembelian.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    createPurchaseMutation.mutate();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Catat Pembelian / Restock Masuk dari Supplier"
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-2">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
            <div className="flex-1">{errorMsg}</div>
          </div>
        )}

        {/* Section 1: Header Pembelian */}
        <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-200 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-800 pb-2 border-b border-gray-200">
            <Truck className="w-4 h-4 text-brand-600" />
            <span>Informasi Supplier & Faktur</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Pilih Supplier <span className="text-rose-500">*</span>
              </label>
              <Select
                value={supplierId}
                onChange={(e) => setSupplierId(Number(e.target.value))}
                options={[
                  { value: '', label: '-- Pilih Supplier --' },
                  ...suppliers.map((s) => ({
                    value: s.id,
                    label: `${s.code} - ${s.name}`,
                  })),
                ]}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                No. Faktur / Surat Jalan Supplier
              </label>
              <Input
                value={supplierInvoiceNo}
                onChange={(e) => setSupplierInvoiceNo(e.target.value)}
                placeholder="Misal: SJ-WINGS-2026/04"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Tanggal Barang Masuk
              </label>
              <div className="relative">
                <Input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Payment Terms */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Sistem Pembayaran
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentType('CASH')}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg border transition ${
                    paymentType === 'CASH'
                      ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Tunai (Cash Lunas)
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentType('TEMPO')}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg border transition ${
                    paymentType === 'TEMPO'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Tempo (Hutang Bon)
                </button>
              </div>
            </div>

            {paymentType === 'TEMPO' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-amber-900 uppercase mb-1">
                    Jatuh Tempo Pembayaran <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="border-amber-300 bg-amber-50/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-amber-900 uppercase mb-1">
                    Uang Muka / DP Dibayar (Rp)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max={calculatedTotal}
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(Number(e.target.value))}
                    placeholder="0 jika belum bayar sama sekali"
                    className="border-amber-300 bg-amber-50/40"
                  />
                  <p className="text-[11px] text-amber-700 mt-1">
                    Sisa hutang: {formatRupiah(Math.max(0, calculatedTotal - amountPaid))}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Section 2: Items Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <span>Daftar Barang Kulakan Masuk</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-brand-100 text-brand-800 font-semibold">
                {items.length} item
              </span>
            </h4>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setIsScanning(true)}
                className="flex items-center gap-1.5 text-brand-700 bg-brand-50 hover:bg-brand-100 border-brand-200"
              >
                <Camera className="w-4 h-4 text-brand-600" />
                <span>Scan Barcode Masuk</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addItemRow}
                className="flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Baris Barang</span>
              </Button>
            </div>
          </div>

          <div className="border border-gray-200 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-100/80 text-gray-700 font-semibold border-b border-gray-200">
                  <tr>
                    <th className="py-2.5 px-3 w-6/12">Barang & Produk</th>
                    <th className="py-2.5 px-3 w-2/12">Satuan Kulakan</th>
                    <th className="py-2.5 px-3 w-1.5/12 text-center">Jumlah (Qty)</th>
                    <th className="py-2.5 px-3 w-2/12">Harga Beli Satuan</th>
                    <th className="py-2.5 px-3 w-2/12 text-right">Subtotal</th>
                    <th className="py-2.5 px-2 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {items.map((item, idx) => {
                    const prod = products.find((p) => p.id === item.productId);
                    const selectedUnit = prod?.units.find((u) => u.id === item.productUnitId);
                    const factor = selectedUnit ? selectedUnit.conversionFactor : 1;
                    const baseQty = (Number(item.quantity) || 0) * factor;
                    const baseCost = factor > 0 ? (Number(item.unitCost) || 0) / factor : 0;
                    const subtotal = (Number(item.quantity) || 0) * (Number(item.unitCost) || 0);

                    return (
                      <tr key={item.id} className="hover:bg-gray-50/70 transition">
                        <td className="p-3">
                          <Select
                            value={item.productId}
                            onChange={(e) => handleProductChange(idx, Number(e.target.value))}
                            options={products.map((p) => ({
                              value: p.id,
                              label: `${p.barcode ? `[${p.barcode}] ` : ''}${p.name} (Stok: ${formatNumber(p.currentStock)} ${p.baseUnit})`,
                            }))}
                            className="w-full text-xs"
                          />
                          <div className="flex items-center gap-2 mt-1.5">
                            <label className="text-[11px] text-gray-500 flex items-center gap-1 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={item.updateProductCost}
                                onChange={(e) =>
                                  updateItemField(idx, 'updateProductCost', e.target.checked)
                                }
                                className="rounded text-brand-600 focus:ring-brand-500 w-3.5 h-3.5"
                              />
                              <span>Update HPP katalog ({formatRupiah(baseCost)}/{prod?.baseUnit})</span>
                            </label>
                          </div>
                        </td>

                        <td className="p-3">
                          <Select
                            value={item.productUnitId || ''}
                            onChange={(e) =>
                              handleUnitChange(idx, e.target.value ? Number(e.target.value) : null)
                            }
                            options={[
                              ...(prod?.units.map((u) => ({
                                value: u.id || 0,
                                label: `${u.unitName} (${u.conversionFactor} ${prod?.baseUnit})`,
                              })) || []),
                            ]}
                            className="w-full text-xs"
                          />
                          <p className="text-[10px] text-gray-400 mt-1">
                            +{formatNumber(baseQty)} {prod?.baseUnit} masuk
                          </p>
                        </td>

                        <td className="p-3">
                          <Input
                            type="number"
                            min="1"
                            step="any"
                            value={item.quantity}
                            onKeyDown={(e) => {
                              if (e.key === '-' || e.key === 'e') e.preventDefault();
                            }}
                            onChange={(e) =>
                              updateItemField(idx, 'quantity', Math.max(1, parseFloat(e.target.value) || 0))
                            }
                            className="text-center font-bold text-xs"
                          />
                        </td>

                        <td className="p-3">
                          <Input
                            type="number"
                            min="0"
                            step="100"
                            value={item.unitCost}
                            onKeyDown={(e) => {
                              if (e.key === '-' || e.key === 'e') e.preventDefault();
                            }}
                            onChange={(e) =>
                              updateItemField(idx, 'unitCost', Math.max(0, parseFloat(e.target.value) || 0))
                            }
                            className="font-medium text-xs"
                          />
                        </td>

                        <td className="p-3 text-right font-bold text-gray-900 text-xs">
                          {formatRupiah(subtotal)}
                        </td>

                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeItemRow(idx)}
                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition"
                            title="Hapus baris barang"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Section 3: Ringkasan Biaya & Catatan */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start pt-2">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
              Catatan Pembelian (Opsional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Misal: Barang diantar truk B 1234 CD, kondisi bagus."
              className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-2.5 text-xs">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal Pembelian:</span>
              <span className="font-semibold text-gray-900">{formatRupiah(calculatedSubtotal)}</span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-gray-600">Diskon / Potongan (Rp):</span>
              <input
                type="number"
                min="0"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(Number(e.target.value))}
                className="w-32 px-2 py-1 text-right text-xs rounded border border-gray-300 font-medium"
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-gray-600">PPN / Ongkos Kirim (Rp):</span>
              <input
                type="number"
                min="0"
                value={taxAmount}
                onChange={(e) => setTaxAmount(Number(e.target.value))}
                className="w-32 px-2 py-1 text-right text-xs rounded border border-gray-300 font-medium"
              />
            </div>

            <div className="pt-2 border-t border-gray-200 flex justify-between items-center text-sm">
              <span className="font-bold text-gray-900">Total Tagihan Kulakan:</span>
              <span className="font-black text-brand-700 text-base">{formatRupiah(calculatedTotal)}</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={createPurchaseMutation.isPending}
          >
            Batal
          </Button>
          <Button
            type="submit"
            isLoading={createPurchaseMutation.isPending}
            className="flex items-center gap-2"
          >
            <CreditCard className="w-4 h-4" />
            <span>Simpan Pembelian & Masukkan Stok</span>
          </Button>
        </div>
      </form>

      <BarcodeScannerModal
        isOpen={isScanning}
        onClose={() => setIsScanning(false)}
        title="Scan Barcode Barang Masuk (Restock)"
        scannerId="purchase-form-barcode-scanner"
        onScan={handleBarcodeScanned}
      />
    </Modal>
  );
};
