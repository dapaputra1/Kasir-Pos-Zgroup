import React, { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Camera,
  Upload,
  Sparkles,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Key,
  ExternalLink,
  Trash2,
  PackagePlus,
  Store,
  DollarSign,
  Calendar,
  FileText,
  Plus,
  Layers,
  Image as ImageIcon,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { useToast } from '../ui/Toast';
import { api } from '../../lib/api';
import { formatRupiah, formatNumber } from '../../lib/utils';
import { sound } from '../../lib/sound';
import { Category } from '../../types/product';

interface AiScanReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface ReceiptPageItem {
  id: string;
  file?: File;
  preview: string;
  name: string;
}

export const AiScanReceiptModal: React.FC<AiScanReceiptModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { success, error: toastError } = useToast();
  const queryClient = useQueryClient();

  // Step state: 1 = upload, 2 = review & edit
  const [step, setStep] = useState<1 | 2>(1);

  // Multi-page Image list
  const [receiptPages, setReceiptPages] = useState<ReceiptPageItem[]>([]);
  const [geminiApiKey, setGeminiApiKey] = useState<string>(() => {
    return localStorage.getItem('grosirpos_gemini_api_key') || '';
  });
  const [showKeyInput, setShowKeyInput] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Extracted data states (for Step 2)
  const [supplierName, setSupplierName] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [supplierAddress, setSupplierAddress] = useState('');
  const [supplierId, setSupplierId] = useState<number | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [paymentType, setPaymentType] = useState<'CASH' | 'TEMPO'>('CASH');
  const [dueDays, setDueDays] = useState<number>(7);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<any[]>([]);

  // Fetch categories for mapping
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories-active'],
    queryFn: async () => {
      const res = await api.get('/categories?limit=50');
      return res.data.data;
    },
    enabled: isOpen,
  });

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setReceiptPages([]);
      setItems([]);
    }
  }, [isOpen]);

  // Handle file select (supports multiple files)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    selectedFiles.forEach((file) => {
      if (!file.type.startsWith('image/')) {
        toastError(`File "${file.name}" bukan format gambar yang didukung.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (ev) => {
        const preview = ev.target?.result as string;
        setReceiptPages((prev) => [
          ...prev,
          {
            id: `page-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            file,
            preview,
            name: file.name,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });

    // Reset input so user can pick the same file or add more
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removePage = (id: string) => {
    setReceiptPages((prev) => prev.filter((p) => p.id !== id));
  };

  // Scan Mutation
  const scanMutation = useMutation({
    mutationFn: async () => {
      if (receiptPages.length === 0) {
        throw new Error('Harap unggah atau foto setidaknya satu lembar nota.');
      }

      // Save key if entered
      if (geminiApiKey) {
        localStorage.setItem('grosirpos_gemini_api_key', geminiApiKey.trim());
      }

      const res = await api.post('/purchases/scan-receipt', {
        images: receiptPages.map((p) => ({
          imageBase64: p.preview,
          mimeType: p.file?.type || 'image/jpeg',
        })),
        geminiApiKey: geminiApiKey.trim() || undefined,
      });

      return res.data.data;
    },
    onSuccess: (data) => {
      sound.playSuccess();
      setSupplierName(data.supplier?.name || '');
      setSupplierPhone(data.supplier?.phone || '');
      setSupplierAddress(data.supplier?.address || '');
      setSupplierId(data.supplier?.id || null);
      setInvoiceNumber(data.invoiceNumber || '');
      setPurchaseDate(data.date || new Date().toISOString().slice(0, 10));
      setPaymentType(data.paymentType || 'CASH');
      setDueDays(data.dueDays || 7);
      setNotes(data.notes || '');
      setItems(data.items || []);

      setStep(2);
      success(
        `Nota (${receiptPages.length} lembar) berhasil dianalisis! Ditemukan ${data.items?.length || 0} barang.`
      );
    },
    onError: (err: any) => {
      sound.playError();
      const code = err.response?.data?.error?.code;
      if (code === 'GEMINI_KEY_REQUIRED') {
        setShowKeyInput(true);
      }
      toastError(err.response?.data?.error?.message || err.message || 'Gagal menganalisis nota.');
    },
  });

  // Calculate Due Date based on dueDays
  const calculatedDueDate = (() => {
    if (paymentType !== 'TEMPO') return null;
    const d = new Date(purchaseDate);
    d.setDate(d.getDate() + (Number(dueDays) || 7));
    return d.toISOString().slice(0, 10);
  })();

  // Item modification helpers
  const updateItem = (index: number, field: string, value: any) => {
    setItems((prev) => {
      const copy = [...prev];
      const it = { ...copy[index], [field]: value };

      if (field === 'quantity' || field === 'unitPrice') {
        it.subtotal = (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0);
      }
      if (field === 'unitPrice' || field === 'conversionFactor') {
        const factor = Number(it.conversionFactor) || 1;
        it.baseCost = factor > 0 ? Math.round((Number(it.unitPrice) || 0) / factor) : 0;
        if (!it.suggestedSellingPrice) {
          it.suggestedSellingPrice = Math.round((it.baseCost * 1.1) / 100) * 100;
        }
      }

      copy[index] = it;
      return copy;
    });
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const totalCalculated = items.reduce((sum, it) => sum + (Number(it.subtotal) || 0), 0);

  // Import Mutation
  const importMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        supplier: {
          id: supplierId,
          name: supplierName || 'Supplier Toko',
          phone: supplierPhone,
          address: supplierAddress,
        },
        supplierInvoiceNo: invoiceNumber,
        purchaseDate,
        paymentType,
        dueDate: calculatedDueDate,
        notes,
        totalAmount: totalCalculated,
        items: items.map((it) => ({
          productId: it.matchedProductId || null,
          name: it.name,
          categoryId: Number(it.categoryId) || null,
          baseUnit: (it.baseUnit || 'PCS').toUpperCase(),
          purchaseUnitName: (it.unit || it.baseUnit || 'PCS').toUpperCase(),
          conversionFactor: Number(it.conversionFactor) || 1,
          quantity: Number(it.quantity) || 1,
          unitCost: Number(it.unitPrice) || 0,
          baseCost: Number(it.baseCost) || Number(it.unitPrice) || 0,
          subtotal: Number(it.subtotal) || 0,
          sellingPrice: Number(it.suggestedSellingPrice) || 0,
          wholesalePrice: Number(it.suggestedWholesalePrice) || 0,
        })),
      };

      const res = await api.post('/purchases/smart-import', payload);
      return res.data;
    },
    onSuccess: () => {
      sound.playSuccess();
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['purchases-summary'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products-all'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      success('Seluruh data nota & stok barang berhasil diimpor ke sistem!');
      onClose();
      onSuccess?.();
    },
    onError: (err: any) => {
      sound.playError();
      toastError(err.response?.data?.error?.message || err.message || 'Gagal mengimpor data nota.');
    },
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="📸 Scan & Import Nota Otomatis (Multi-Halaman AI)"
      maxWidth={step === 1 ? 'max-w-2xl' : 'max-w-5xl'}
    >
      <div className="space-y-5">
        {step === 1 ? (
          /* STEP 1: Upload / Capture Multi-Page Receipts */
          <div className="space-y-4">
            <div className="bg-brand-50 border border-brand-200 rounded-xl p-3.5 flex items-start gap-3 text-xs text-brand-900">
              <Sparkles className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm text-brand-950 flex items-center gap-1.5">
                  <span>AI Smart Receipt Scanner (Mendukung Multi-Halaman)</span>
                  <span className="text-[10px] px-2 py-0.5 bg-brand-200 text-brand-900 rounded-full font-bold">
                    Multi-Page
                  </span>
                </p>
                <p className="mt-0.5 text-brand-800 leading-relaxed">
                  Jika nota terdiri dari <strong>lebih dari 1 lembar (Lembar 1, Lembar 2, dst)</strong>, Anda bisa memotret atau mengunggah semua lembarnya sekaligus. AI akan otomatis menggabungkan seluruh daftar barang menjadi satu faktur utuh.
                </p>
              </div>
            </div>

            {/* Hidden Input File */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* List of Uploaded Pages / Dropzone */}
            {receiptPages.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-brand-600" />
                    <span>Lembar Nota yang Siap Dianalisis ({receiptPages.length} Lembar)</span>
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs flex items-center gap-1 font-semibold text-brand-700 border-brand-300 hover:bg-brand-50"
                  >
                    <Plus className="w-3.5 h-3.5" /> Tambah Lembar Berikutnya
                  </Button>
                </div>

                {/* Grid of Pages */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {receiptPages.map((page, index) => (
                    <div
                      key={page.id}
                      className="group relative border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm hover:border-brand-400 transition-all"
                    >
                      <div className="h-36 bg-gray-100 flex items-center justify-center overflow-hidden">
                        <img
                          src={page.preview}
                          alt={`Lembar ${index + 1}`}
                          className="h-full w-full object-cover object-top"
                        />
                      </div>
                      <div className="p-2 flex items-center justify-between bg-white border-t border-gray-100">
                        <span className="text-xs font-bold text-gray-800">
                          Lembar {index + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removePage(page.id)}
                          className="p-1 rounded text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Hapus lembar ini"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Add Page Card */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="h-44 border-2 border-dashed border-gray-300 hover:border-brand-500 rounded-xl flex flex-col items-center justify-center cursor-pointer bg-gray-50/50 hover:bg-brand-50/30 transition-all text-center p-3"
                  >
                    <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 mb-2">
                      <Plus className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-gray-800">Tambah Lembar</span>
                    <span className="text-[10px] text-gray-500 mt-0.5">Lembar ke-{receiptPages.length + 1}</span>
                  </div>
                </div>
              </div>
            ) : (
              /* Empty Dropzone */
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 hover:border-brand-500 rounded-2xl p-8 text-center cursor-pointer hover:bg-gray-50 transition-all space-y-3"
              >
                <div className="w-16 h-16 mx-auto rounded-2xl bg-brand-100 flex items-center justify-center text-brand-600 shadow-sm">
                  <Camera className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">
                    Ambil Foto atau Pilih Gambar Nota
                  </p>
                  <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                    Bisa memilih <strong>1 foto atau lebih</strong> sekaligus jika nota terdiri dari beberapa lembar.
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" className="mt-2 font-semibold">
                  <Upload className="w-4 h-4 mr-1.5" /> Pilih File Gambar Nota
                </Button>
              </div>
            )}

            {/* Gemini API Key Configuration Toggle */}
            <div className="border border-gray-200 rounded-xl p-3 bg-gray-50/50">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowKeyInput(!showKeyInput)}
                  className="text-xs font-semibold text-gray-700 flex items-center gap-1.5 hover:text-brand-600 transition-colors"
                >
                  <Key className="w-3.5 h-3.5 text-brand-600" />
                  <span>Kunci API Google Gemini (AI Vision)</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-600">
                    {geminiApiKey ? 'Tersimpan ✓' : 'Opsional'}
                  </span>
                </button>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-brand-600 hover:underline flex items-center gap-1 font-medium"
                >
                  Dapatkan Gratis <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {showKeyInput && (
                <div className="mt-3 pt-2.5 border-t border-gray-200 space-y-2">
                  <Input
                    type="password"
                    placeholder="Tempel AI Studio Gemini API Key di sini (AIzaSy...)"
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                    className="text-xs"
                  />
                  <p className="text-[11px] text-gray-500 leading-relaxed">
                    API Key disimpan aman di browser Anda dan gratis hingga ribuan kali scan per hari via Google AI Studio.
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2.5 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Batal
              </Button>
              <Button
                type="button"
                disabled={receiptPages.length === 0 || scanMutation.isPending}
                onClick={() => scanMutation.mutate()}
                className="flex items-center gap-2 font-semibold shadow-md bg-brand-600 hover:bg-brand-700"
              >
                {scanMutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>AI Sedang Membaca {receiptPages.length} Lembar...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>
                      Analisis {receiptPages.length > 0 ? `${receiptPages.length} Lembar ` : ''}Nota Sekarang
                    </span>
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          /* STEP 2: Review & Edit Extracted Data */
          <div className="space-y-5">
            {/* Top Bar Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-gray-50 p-3.5 rounded-xl border border-gray-200 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">
                  Nama Supplier
                </label>
                <Input
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  placeholder="Nama Toko Supplier"
                  className="text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">
                  Nomor Faktur Nota
                </label>
                <Input
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="Contoh: JT 261108027"
                  className="text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">
                  Tanggal Transaksi
                </label>
                <Input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">
                  Tipe Pembayaran
                </label>
                <Select
                  value={paymentType}
                  onChange={(e) => setPaymentType(e.target.value as any)}
                  className="text-xs font-semibold"
                >
                  <option value="CASH">Lunas (Tunai / CASH)</option>
                  <option value="TEMPO">Hutang (TEMPO)</option>
                </Select>
              </div>
            </div>

            {/* If Tempo, show due date control */}
            {paymentType === 'TEMPO' && (
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs text-amber-900">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-600" />
                  <span className="font-semibold">Batas Waktu Jatuh Tempo:</span>
                  <span className="font-bold text-amber-950">
                    {calculatedDueDate} ({dueDays} Hari dari tanggal nota)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-amber-800">Ubah Tempo:</span>
                  <select
                    value={dueDays}
                    onChange={(e) => setDueDays(Number(e.target.value))}
                    className="text-xs font-semibold border border-amber-300 rounded px-2 py-1 bg-white"
                  >
                    <option value={7}>7 Hari</option>
                    <option value={14}>14 Hari</option>
                    <option value={30}>30 Hari</option>
                    <option value={45}>45 Hari</option>
                  </select>
                </div>
              </div>
            )}

            {/* Items Table */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <PackagePlus className="w-4 h-4 text-brand-600" />
                  <span>Daftar Gabungan Barang ({items.length} Item dari {receiptPages.length} Lembar)</span>
                </h3>
                <span className="text-xs text-gray-500">
                  Periksa nama, kategori, harga modal, dan tentukan harga jual toko Anda
                </span>
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm max-h-[380px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-gray-100 text-gray-700 sticky top-0 z-10 border-b border-gray-200 font-semibold">
                    <tr>
                      <th className="p-2.5 w-10 text-center">#</th>
                      <th className="p-2.5">Nama Produk</th>
                      <th className="p-2.5 w-36">Kategori</th>
                      <th className="p-2.5 w-20 text-center">Qty Beli</th>
                      <th className="p-2.5 w-24">Satuan Beli</th>
                      <th className="p-2.5 w-28 text-right">Harga Modal</th>
                      <th className="p-2.5 w-28 text-right">Subtotal</th>
                      <th className="p-2.5 w-28 text-right bg-brand-50/50">Jual Eceran</th>
                      <th className="p-2.5 w-10 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map((it, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/80 transition-colors">
                        <td className="p-2.5 text-center text-gray-400 font-medium">{idx + 1}</td>

                        {/* Nama Produk */}
                        <td className="p-2">
                          <Input
                            value={it.name}
                            onChange={(e) => updateItem(idx, 'name', e.target.value)}
                            className="text-xs font-semibold h-8"
                          />
                          <div className="flex items-center gap-1.5 mt-1">
                            {it.isExistingProduct ? (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-medium">
                                Produk Terdaftar ({it.matchedProductSku})
                              </span>
                            ) : (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 font-medium">
                                Produk Baru
                              </span>
                            )}
                            <span className="text-[10px] text-gray-400 truncate max-w-[140px]">
                              Nota: {it.rawName}
                            </span>
                          </div>
                        </td>

                        {/* Kategori */}
                        <td className="p-2">
                          <Select
                            value={it.categoryId || ''}
                            onChange={(e) => updateItem(idx, 'categoryId', Number(e.target.value))}
                            className="text-xs h-8"
                          >
                            {categories.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </Select>
                        </td>

                        {/* Qty */}
                        <td className="p-2 text-center">
                          <Input
                            type="number"
                            min="0.1"
                            step="any"
                            value={it.quantity}
                            onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                            className="text-xs text-center font-bold h-8"
                          />
                        </td>

                        {/* Satuan Beli */}
                        <td className="p-2">
                          <Input
                            value={it.unit}
                            onChange={(e) => updateItem(idx, 'unit', e.target.value.toUpperCase())}
                            className="text-xs font-semibold h-8 uppercase"
                          />
                          <div className="text-[10px] text-gray-500 mt-1">
                            1 {it.unit} = {it.conversionFactor} {it.baseUnit}
                          </div>
                        </td>

                        {/* Harga Modal / Satuan Beli */}
                        <td className="p-2 text-right">
                          <Input
                            type="number"
                            value={it.unitPrice}
                            onChange={(e) => updateItem(idx, 'unitPrice', e.target.value)}
                            className="text-xs text-right font-medium h-8"
                          />
                        </td>

                        {/* Subtotal */}
                        <td className="p-2 text-right font-bold text-gray-900">
                          {formatRupiah(it.subtotal || 0)}
                        </td>

                        {/* Jual Eceran */}
                        <td className="p-2 text-right bg-brand-50/30">
                          <Input
                            type="number"
                            value={it.suggestedSellingPrice || ''}
                            onChange={(e) => updateItem(idx, 'suggestedSellingPrice', e.target.value)}
                            placeholder="Harga Jual"
                            className="text-xs text-right font-bold text-brand-700 h-8 border-brand-300 focus:border-brand-500"
                          />
                          <span className="text-[10px] text-gray-500">/{it.baseUnit}</span>
                        </td>

                        {/* Hapus */}
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeItem(idx)}
                            className="p-1 rounded text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Notes & Total Footer */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-2 border-t border-gray-200">
              <div className="w-full sm:w-1/2">
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Catatan tambahan nota (opsional, misal bonus barang)"
                  className="text-xs"
                />
              </div>

              <div className="text-right">
                <p className="text-xs text-gray-500">Total Pembelian Nota:</p>
                <p className="text-xl font-black text-brand-700">{formatRupiah(totalCalculated)}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setStep(1)}
                className="text-xs"
              >
                ← Scan Ulang Foto
              </Button>

              <div className="flex items-center gap-2.5">
                <Button type="button" variant="outline" onClick={onClose}>
                  Batal
                </Button>
                <Button
                  type="button"
                  disabled={items.length === 0 || importMutation.isPending}
                  onClick={() => importMutation.mutate()}
                  className="font-bold shadow-md bg-brand-600 hover:bg-brand-700 flex items-center gap-2"
                >
                  {importMutation.isPending ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Menyimpan ke Database...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Simpan Pembelian & Masukkan Stok ({items.length} Item)</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
