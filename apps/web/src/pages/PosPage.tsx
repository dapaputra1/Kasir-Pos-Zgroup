import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Barcode,
  Camera,
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CreditCard,
  AlertTriangle,
  RotateCcw,
  UserCheck,
  CheckCircle2,
  DollarSign,
  Package,
  Clock,
  Wallet,
  PauseCircle,
} from 'lucide-react';
import { api } from '../lib/api';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { BarcodeScannerModal } from '../components/pos/BarcodeScannerModal';
import { ReceiptModal } from '../components/pos/ReceiptModal';
import { StartShiftModal } from '../components/pos/StartShiftModal';
import { CloseShiftModal } from '../components/pos/CloseShiftModal';
import { HoldCartModal } from '../components/pos/HoldCartModal';
import { CartItem, Order, PaymentMethod, Customer } from '../types/pos';
import { Product, ProductUnit } from '../types/product';
import { Category } from '../types/category';
import { CashShift } from '../types/shift';
import { formatNumber, formatRupiah } from '../lib/utils';
import { sound } from '../lib/sound';

export const PosPage: React.FC = () => {
  const { success, error: toastError } = useToast();
  const queryClient = useQueryClient();

  // 1. State for Cart & Customer
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerTier, setCustomerTier] = useState<'REGULAR' | 'GROSIR'>('REGULAR');
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);

  // 2. State for Barcode & Search
  const [barcodeInput, setBarcodeInput] = useState('');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // 3. State for Payment Modal & Receipt
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [orderNotes, setOrderNotes] = useState('');
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);

  // 4. State for Shift & Hold Cart (Tahap 7)
  const [isStartShiftModalOpen, setIsStartShiftModalOpen] = useState(false);
  const [isCloseShiftModalOpen, setIsCloseShiftModalOpen] = useState(false);
  const [isHoldCartModalOpen, setIsHoldCartModalOpen] = useState(false);
  const [holdCartMode, setHoldCartMode] = useState<'save' | 'list'>('list');
  const [heldCartCount, setHeldCartCount] = useState<number>(() => {
    try {
      const stored = localStorage.getItem('grosirpos_held_carts');
      return stored ? JSON.parse(stored).length : 0;
    } catch {
      return 0;
    }
  });

  const updateHeldCartCount = () => {
    try {
      const stored = localStorage.getItem('grosirpos_held_carts');
      setHeldCartCount(stored ? JSON.parse(stored).length : 0);
    } catch {
      setHeldCartCount(0);
    }
  };

  // Fetch Current Cash Shift
  const { data: currentShift } = useQuery<CashShift | null>({
    queryKey: ['current-shift'],
    queryFn: async () => {
      const res = await api.get('/shifts/current');
      return res.data.data;
    },
  });

  // Tablet portrait tab toggle
  const [activeTabletTab, setActiveTabletTab] = useState<'catalog' | 'cart'>('catalog');

  // Autofocus barcode input on mount and after actions
  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  // Keyboard shortcuts (F2, F4, F8)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        barcodeInputRef.current?.focus();
      } else if (e.key === 'F4') {
        e.preventDefault();
        if (cart.length > 0) {
          openPaymentModal();
        }
      } else if (e.key === 'F8') {
        e.preventDefault();
        setIsCameraModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart]);

  // Fetch Categories
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get('/categories');
      return res.data.data;
    },
  });

  // Fetch Customers
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: async () => {
      const res = await api.get('/customers?active=true&limit=100');
      return res.data.data;
    },
  });

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  // Fetch POS Catalog Products
  const { data: catalogProducts = [], isLoading: isCatalogLoading } = useQuery<Product[]>({
    queryKey: ['pos-catalog', catalogSearch, selectedCategoryId],
    queryFn: async () => {
      const params: any = {};
      if (catalogSearch.trim()) params.search = catalogSearch.trim();
      if (selectedCategoryId) params.categoryId = selectedCategoryId;
      const res = await api.get('/pos/catalog', { params });
      return res.data.data;
    },
  });

  // Barcode Scan Handler
  const handleBarcodeLookup = async (code: string) => {
    const clean = code.trim();
    if (!clean) return;

    try {
      const res = await api.get(`/pos/scan/${encodeURIComponent(clean)}`);
      const { product, matchedUnit } = res.data.data;

      sound.playScanSuccess();
      addProductToCart(product, matchedUnit);
      setBarcodeInput('');
      barcodeInputRef.current?.focus();
    } catch (err: any) {
      sound.playScanError();
      toastError(err.message || `Barang dengan barcode '${clean}' tidak ditemukan.`);
      setBarcodeInput('');
      barcodeInputRef.current?.focus();
    }
  };

  // Add Product to Cart
  const addProductToCart = (product: Product, unitToSelect?: ProductUnit) => {
    const defaultUnit =
      unitToSelect ||
      product.units.find((u) => u.isBaseUnit) ||
      product.units[0];

    const price =
      customerTier === 'GROSIR' && defaultUnit.wholesalePrice && Number(defaultUnit.wholesalePrice) > 0
        ? Number(defaultUnit.wholesalePrice)
        : Number(defaultUnit.price);

    setCart((prev) => {
      const existingIdx = prev.findIndex(
        (item) => item.productId === product.id && item.selectedUnit.id === defaultUnit.id
      );

      if (existingIdx >= 0) {
        // Increment quantity
        const updated = [...prev];
        const newQty = updated[existingIdx].quantity + 1;
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: newQty,
          subtotal: newQty * updated[existingIdx].unitPrice,
        };
        return updated;
      } else {
        // Add new item
        const newItem: CartItem = {
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          barcode: product.barcode,
          baseUnit: product.baseUnit,
          currentStock: Number(product.currentStock),
          selectedUnit: defaultUnit,
          availableUnits: product.units,
          quantity: 1,
          unitPrice: price,
          subtotal: price,
        };
        return [newItem, ...prev];
      }
    });

    success(`Ditambahkan: ${product.name} (1 ${defaultUnit.unitName})`);
  };

  // Change Unit of a Cart Item
  const handleUnitChange = (index: number, newUnitId: number) => {
    setCart((prev) => {
      const updated = [...prev];
      const item = updated[index];
      const newUnit = item.availableUnits.find((u) => u.id === newUnitId);
      if (!newUnit) return prev;

      const price =
        customerTier === 'GROSIR' && newUnit.wholesalePrice && Number(newUnit.wholesalePrice) > 0
          ? Number(newUnit.wholesalePrice)
          : Number(newUnit.price);

      updated[index] = {
        ...item,
        selectedUnit: newUnit,
        unitPrice: price,
        subtotal: item.quantity * price,
      };
      return updated;
    });
  };

  // Update Cart Quantity
  const handleQuantityChange = (index: number, qty: number) => {
    if (qty <= 0) {
      handleRemoveItem(index);
      return;
    }
    setCart((prev) => {
      const updated = [...prev];
      const item = updated[index];
      updated[index] = {
        ...item,
        quantity: qty,
        subtotal: qty * item.unitPrice,
      };
      return updated;
    });
  };

  // Remove Item
  const handleRemoveItem = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  // Change Customer Tier
  const handleCustomerTierChange = (tier: 'REGULAR' | 'GROSIR') => {
    setCustomerTier(tier);
    // Recalculate cart prices according to tier
    setCart((prev) =>
      prev.map((item) => {
        const price =
          tier === 'GROSIR' && item.selectedUnit.wholesalePrice && Number(item.selectedUnit.wholesalePrice) > 0
            ? Number(item.selectedUnit.wholesalePrice)
            : Number(item.selectedUnit.price);
        return {
          ...item,
          unitPrice: price,
          subtotal: item.quantity * price,
        };
      })
    );
  };

  // Subtotal, Discount, & Total
  const subtotal = cart.reduce((acc, item) => acc + item.subtotal, 0);
  const totalAmount = Math.max(0, subtotal - discountAmount);
  const changeAmount = paymentMethod === 'CASH' ? Math.max(0, amountPaid - totalAmount) : 0;

  // Open Payment Modal
  const openPaymentModal = () => {
    setAmountPaid(totalAmount);
    setIsPaymentModalOpen(true);
  };

  // Checkout Mutation
  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        customerId: selectedCustomerId,
        paymentMethod,
        amountPaid: paymentMethod === 'CASH' ? amountPaid : totalAmount,
        discountAmount,
        notes: orderNotes,
        items: cart.map((item) => ({
          productId: item.productId,
          productUnitId: item.selectedUnit.id,
          quantity: item.quantity,
          customPrice: item.unitPrice,
        })),
      };

      const res = await api.post('/pos/checkout', payload);
      return res.data.data as Order;
    },
    onSuccess: (order) => {
      sound.playCashChime();
      success('Transaksi berhasil diselesaikan!');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['pos-catalog'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });

      setCompletedOrder(order);
      setIsPaymentModalOpen(false);
      setCart([]);
      setDiscountAmount(0);
      setOrderNotes('');
    },
    onError: (err: any) => {
      sound.playScanError();
      toastError(err.message || 'Gagal memproses transaksi.');
    },
  });

  return (
    <div className="h-[calc(100vh-5.5rem)] flex flex-col space-y-3">
      {/* 0. COMMAND BAR: SHIFT STATUS & HOLD CART */}
      <div className="bg-white text-slate-800 px-4 py-2 rounded-lg border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs">
        {/* Left: Shift Info */}
        <div className="flex items-center gap-3">
          {currentShift ? (
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] bg-emerald-50 text-emerald-700 font-medium border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                Shift: {currentShift.user.name}
              </span>
              <span className="text-slate-300 hidden sm:inline">•</span>
              <span className="text-slate-600 hidden sm:inline">
                Modal Awal: <strong className="text-slate-900 font-mono">{formatRupiah(currentShift.startingCash)}</strong>
              </span>
              <span className="text-slate-300 hidden sm:inline">•</span>
              <span className="text-slate-600 hidden sm:inline">
                Kas Penjualan: <strong className="text-slate-900 font-mono">{formatRupiah(currentShift.metrics?.totalCashSales ?? 0)}</strong>
              </span>
              <button
                onClick={() => setIsCloseShiftModalOpen(true)}
                className="text-[11px] h-6 px-2 rounded font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition flex items-center gap-1 ml-1"
              >
                <Wallet className="w-3 h-3" />
                <span>Tutup Shift</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
              <span className="font-medium text-slate-700">Shift kasir belum aktif</span>
              <button
                onClick={() => setIsStartShiftModalOpen(true)}
                className="text-[11px] h-6 px-2.5 rounded font-medium bg-slate-900 hover:bg-slate-800 text-white transition flex items-center gap-1 ml-1"
              >
                <DollarSign className="w-3 h-3" />
                <span>Buka Shift</span>
              </button>
            </div>
          )}
        </div>

        {/* Right: Hold Cart Actions */}
        <div className="flex items-center gap-2">
          {cart.length > 0 && (
            <button
              onClick={() => {
                setHoldCartMode('save');
                setIsHoldCartModalOpen(true);
              }}
              className="text-[11px] h-6 px-2 rounded font-medium text-slate-700 hover:bg-slate-100 border border-slate-200 transition flex items-center gap-1"
            >
              <PauseCircle className="w-3 h-3 text-slate-500" />
              <span>Tahan [F7]</span>
            </button>
          )}

          <button
            onClick={() => {
              setHoldCartMode('list');
              setIsHoldCartModalOpen(true);
            }}
            className="text-[11px] h-6 px-2 rounded font-medium text-slate-700 hover:bg-slate-100 border border-slate-200 transition flex items-center gap-1"
          >
            <Clock className="w-3 h-3 text-slate-500" />
            <span>Keranjang Tertahan</span>
            {heldCartCount > 0 && (
              <span className="ml-0.5 px-1 rounded-full bg-slate-200 text-slate-800 font-mono font-bold text-[10px]">
                {heldCartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 1. FAST BARCODE SCANNER TOOLBAR */}
      <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex-1 min-w-[280px] max-w-xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleBarcodeLookup(barcodeInput);
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <input
                ref={barcodeInputRef}
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="Scan barcode fisik dengan scanner gun (atau tekan F2)..."
                className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 pl-9 text-xs font-mono font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 transition"
              />
              <Barcode className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
            <button
              type="submit"
              className="px-3.5 py-2 rounded-md font-medium text-xs bg-slate-900 hover:bg-slate-800 text-white transition shrink-0 flex items-center gap-1.5"
            >
              <span>Scan Barcode</span>
            </button>
          </form>
        </div>

        {/* Camera Scanner Button & Status */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsCameraModalOpen(true)}
            className="px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 transition flex items-center gap-1.5"
            title="Scan menggunakan kamera perangkat (F8)"
          >
            <Camera className="w-3.5 h-3.5 text-slate-500" />
            <span>Kamera (F8)</span>
          </button>

          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-600">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold text-emerald-800">Scanner Standby</span>
          </div>
        </div>
      </div>

      {/* Tablet Portrait Tabs Toggle */}
      <div className="lg:hidden flex bg-white border border-slate-200 rounded-lg p-1 shrink-0 shadow-xs">
        <button
          onClick={() => setActiveTabletTab('catalog')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center justify-center gap-2 ${
            activeTabletTab === 'catalog'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Katalog Barang</span>
        </button>
        <button
          onClick={() => setActiveTabletTab('cart')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center justify-center gap-2 ${
            activeTabletTab === 'cart'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>Keranjang ({cart.length})</span>
          {cart.length > 0 && (
            <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.5 rounded font-mono font-bold">
              {formatRupiah(totalAmount)}
            </span>
          )}
        </button>
      </div>

      {/* 2. MAIN POS WORKSPACE (2-COLUMN GRID) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0 overflow-hidden">
        {/* LEFT COLUMN: CATALOG & QUICK PRODUCT SELECTION */}
        <div
          className={`lg:col-span-7 flex flex-col bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden ${
            activeTabletTab === 'catalog' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {/* Catalog Search & Category Filters Header */}
          <div className="p-2.5 border-b border-slate-200 space-y-2 shrink-0 bg-slate-50/50">
            <div className="relative">
              <input
                placeholder="Cari sembako, SKU, atau barcode... (F2)"
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-md px-3 py-1.5 pl-8 text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 transition"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>

            {/* Category horizontal scroll pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs">
              <button
                onClick={() => setSelectedCategoryId(null)}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap text-xs ${
                  selectedCategoryId === null
                    ? 'bg-slate-900 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Semua
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap text-xs ${
                    selectedCategoryId === cat.id
                      ? 'bg-slate-900 text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Product Cards Grid */}
          <div className="flex-1 p-2.5 overflow-y-auto">
            {isCatalogLoading ? (
              <div className="py-20 text-center text-slate-400 text-xs">
                <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <span>Memuat katalog...</span>
              </div>
            ) : catalogProducts.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs space-y-1">
                <Package className="w-8 h-8 mx-auto text-slate-300 mb-1" />
                <p className="font-semibold text-slate-700">Tidak ada produk ditemukan</p>
                <p className="text-slate-400">Coba kata kunci pencarian atau kategori lain.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2">
                {catalogProducts.map((prod) => {
                  const stockNum = Number(prod.currentStock);
                  const isOut = stockNum <= 0;
                  const baseUnit = prod.units.find((u) => u.isBaseUnit) || prod.units[0];
                  const displayPrice =
                    customerTier === 'GROSIR' && baseUnit?.wholesalePrice && Number(baseUnit.wholesalePrice) > 0
                      ? Number(baseUnit.wholesalePrice)
                      : Number(baseUnit?.price || 0);

                  const otherUnitsCount = prod.units.length - 1;

                  return (
                    <button
                      key={prod.id}
                      type="button"
                      disabled={isOut}
                      onClick={() => addProductToCart(prod)}
                      className={`p-2.5 rounded-lg border text-left flex flex-col justify-between transition-colors select-none min-h-[110px] group ${
                        isOut
                          ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                          : 'bg-white border-slate-200 hover:border-slate-400 hover:bg-slate-50/50'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 text-[10px] text-slate-400 mb-0.5">
                          <span className="font-mono">{prod.sku}</span>
                          <span
                            className={`font-semibold tabular-nums ${
                              isOut
                                ? 'text-rose-600'
                                : stockNum <= Number(prod.minStock)
                                ? 'text-amber-600'
                                : 'text-slate-600'
                            }`}
                          >
                            Stok: {formatNumber(stockNum)} {prod.baseUnit}
                          </span>
                        </div>
                        <h4 className="font-semibold text-xs text-slate-900 line-clamp-2 leading-tight">
                          {prod.name}
                        </h4>
                      </div>

                      <div className="mt-2 pt-1 border-t border-slate-100 flex items-center justify-between gap-1">
                        <div>
                          <span className="font-mono font-bold text-xs text-slate-900 tabular-nums block">
                            {formatRupiah(displayPrice)}
                          </span>
                          {otherUnitsCount > 0 && (
                            <span className="text-[9px] text-slate-400 font-medium block">
                              +{otherUnitsCount} satuan lain
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-600 font-medium bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                          {baseUnit?.unitName || prod.baseUnit}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: POS CART & CHECKOUT CONTROLS */}
        <div
          className={`lg:col-span-5 flex flex-col bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden ${
            activeTabletTab === 'cart' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {/* Cart Header & Customer Tier Toggle */}
          <div className="p-3 border-b border-slate-200 bg-slate-50/50 flex flex-col gap-2 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Keranjang Kasir
                </h3>
                <span className="bg-slate-200 text-slate-800 text-[10px] font-bold px-1.5 py-0.5 rounded">
                  {cart.length} item
                </span>
              </div>

              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCart([])}
                  className="text-[11px] text-rose-600 hover:text-rose-800 font-medium flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Kosongkan</span>
                </button>
              )}
            </div>

            {/* Customer Tier selector */}
            <div className="grid grid-cols-2 gap-1.5 bg-slate-200/60 p-0.5 rounded-md">
              <button
                type="button"
                onClick={() => handleCustomerTierChange('REGULAR')}
                className={`py-1 px-2 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                  customerTier === 'REGULAR'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UserCheck className="w-3 h-3" />
                <span>Eceran (Umum)</span>
              </button>

              <button
                type="button"
                onClick={() => handleCustomerTierChange('GROSIR')}
                className={`py-1 px-2 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                  customerTier === 'GROSIR'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <DollarSign className="w-3 h-3" />
                <span>Langganan Grosir</span>
              </button>
            </div>

            {/* Customer dropdown if Grosir tier is active */}
            {customerTier === 'GROSIR' && (
              <div className="pt-0.5">
                <select
                  value={selectedCustomerId || ''}
                  onChange={(e) =>
                    setSelectedCustomerId(e.target.value ? Number(e.target.value) : null)
                  }
                  className="w-full text-xs font-bold bg-white border border-emerald-300 rounded-xl px-3 py-2 text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                >
                  <option value="">-- Pilih Toko Langganan / Bon Tempo --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code}) {Number(c.creditLimit) > 0 ? `• Plafon ${formatRupiah(c.creditLimit)}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Cart Items List */}
          <div className="flex-1 p-3 overflow-y-auto divide-y divide-slate-100">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center py-12 text-center text-slate-400 text-xs space-y-2">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-300">
                  <ShoppingCart className="w-6 h-6" />
                </div>
                <p className="font-extrabold text-sm text-slate-700">Keranjang Masih Kosong</p>
                <p className="max-w-xs text-slate-400">
                  Scan barcode barang sembako atau pilih produk dari katalog di sebelah kiri.
                </p>
              </div>
            ) : (
              cart.map((item, index) => {
                const totalBaseUnitsNeeded = item.quantity * Number(item.selectedUnit.conversionFactor);
                const isOverStock = totalBaseUnitsNeeded > item.currentStock;

                return (
                  <div key={`${item.productId}-${item.selectedUnit.id}`} className="py-2.5 space-y-2 group">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-extrabold text-xs text-slate-900 leading-tight truncate">
                          {item.productName}
                        </h4>
                        <div className="text-[10px] text-slate-400 font-mono">{item.selectedUnit.barcode || item.barcode || item.sku}</div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="text-slate-300 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-colors"
                        title="Hapus barang"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      {/* Unit Selector */}
                      <div className="flex items-center gap-1.5">
                        <select
                          value={item.selectedUnit.id}
                          onChange={(e) => handleUnitChange(index, Number(e.target.value))}
                          className="bg-slate-100 text-slate-800 font-bold text-xs rounded-lg border border-slate-200/80 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                        >
                          {item.availableUnits.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.unitName} (x{formatNumber(u.conversionFactor)})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(index, item.quantity - 1)}
                          className="px-2 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors min-h-[28px] min-w-[28px] flex items-center justify-center active:scale-90"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          step="any"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            handleQuantityChange(index, parseFloat(e.target.value) || 0)
                          }
                          className="w-12 text-center text-xs font-black text-slate-900 py-1 bg-white focus:outline-none tabular-nums"
                        />
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(index, item.quantity + 1)}
                          className="px-2 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors min-h-[28px] min-w-[28px] flex items-center justify-center active:scale-90"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Subtotal */}
                      <div className="text-right">
                        <div className="font-black text-xs text-emerald-800 tabular-nums">
                          {formatRupiah(item.subtotal)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          @{formatRupiah(item.unitPrice)}
                        </div>
                      </div>
                    </div>

                    {/* Stock Alert Warning if insufficient */}
                    {isOverStock && (
                      <div className="bg-rose-50 border border-rose-200 text-rose-700 text-[10px] p-2 rounded-lg flex items-center gap-1.5 font-medium">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                        <span>
                          Stok tidak mencukupi! Butuh {formatNumber(totalBaseUnitsNeeded)}{' '}
                          {item.baseUnit}, stok fisik di toko hanya {formatNumber(item.currentStock)}{' '}
                          {item.baseUnit}.
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Cart Bottom Summary & Checkout Button */}
          <div className="p-4 bg-slate-50/80 border-t border-slate-200 space-y-3 shrink-0">
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-500 font-medium">
                <span>Subtotal ({cart.length} item)</span>
                <span className="font-bold text-slate-800 font-mono tabular-nums">{formatRupiah(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-rose-600 font-medium">
                  <span>Potongan Diskon</span>
                  <span className="font-mono tabular-nums">-{formatRupiah(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between items-baseline text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Total Tagihan:</span>
                <span className="text-emerald-700 text-lg sm:text-xl font-black font-mono tabular-nums">
                  {formatRupiah(totalAmount)}
                </span>
              </div>
            </div>

            <button
              type="button"
              disabled={cart.length === 0}
              onClick={openPaymentModal}
              className={`w-full py-2.5 px-4 rounded-md font-semibold text-xs transition-colors flex items-center justify-center gap-2 ${
                cart.length === 0
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs'
              }`}
            >
              <CreditCard className="w-4 h-4 text-emerald-400" />
              <span>Bayar Transaksi</span>
              <span className="font-mono bg-slate-800 text-slate-300 px-1 py-0.5 rounded text-[10px] font-medium border border-slate-700">
                F4
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. MODAL PEMBAYARAN KASIR */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="Pembayaran Transaksi"
        description="Pilih metode pembayaran dan konfirmasi nominal pembayaran."
        size="md"
      >
        <div className="space-y-4">
          {/* Total Tagihan Banner */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center space-y-0.5">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total Tagihan
            </span>
            <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {formatRupiah(totalAmount)}
            </div>
          </div>

          {/* Metode Pembayaran Tabs */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Metode Pembayaran
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {(['CASH', 'QRIS', 'TRANSFER', 'TEMPO'] as PaymentMethod[]).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  className={`py-1.5 px-2 text-xs font-medium rounded-md border text-center transition-colors ${
                    paymentMethod === method
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {method === 'TEMPO' ? 'Tempo / Bon' : method}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Cash Buttons (for Cash Payment) */}
          {paymentMethod === 'CASH' && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  <span>Pilihan Cepat Uang Tunai</span>
                  <button
                    type="button"
                    onClick={() => setAmountPaid(totalAmount)}
                    className="text-emerald-700 hover:underline normal-case font-medium"
                  >
                    Uang Pas
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-xs font-mono font-medium">
                  {[totalAmount, 50000, 100000, 150000, 200000, 500000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setAmountPaid(amt)}
                      className={`p-2 rounded-md border transition-colors tabular-nums ${
                        amountPaid === amt
                          ? 'bg-slate-900 text-white border-slate-900 font-bold'
                          : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      {formatRupiah(amt)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Uang Tunai Diterima (Rp)
                </label>
                <input
                  type="number"
                  value={amountPaid || ''}
                  onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-lg font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              {/* Kembalian calculation banner */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600">Kembalian Uang:</span>
                <span
                  className={`text-base font-bold font-mono tabular-nums ${
                    amountPaid < totalAmount ? 'text-rose-600' : 'text-slate-900'
                  }`}
                >
                  {amountPaid < totalAmount
                    ? `Kurang ${formatRupiah(totalAmount - amountPaid)}`
                    : formatRupiah(changeAmount)}
                </span>
              </div>
            </div>
          )}

          {/* Diskon / Catatan Tambahan */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Potongan Diskon (Rp)
              </label>
              <input
                type="number"
                value={discountAmount || ''}
                onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Catatan Struk (Opsional)
              </label>
              <input
                placeholder="Misal: Bon titip warung"
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsPaymentModalOpen(false)}
              disabled={checkoutMutation.isPending}
              className="px-3 py-2 rounded-md text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={paymentMethod === 'CASH' && amountPaid < totalAmount}
              onClick={() => checkoutMutation.mutate()}
              className="px-4 py-2 rounded-md text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-xs disabled:opacity-50 flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Selesaikan Transaksi & Cetak Struk</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* 4. MODAL SCANNER KAMERA */}
      <BarcodeScannerModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onScan={(code) => {
          setIsCameraModalOpen(false);
          handleBarcodeLookup(code);
        }}
      />

      {/* 5. MODAL CETAK STRUK PEMBAYARAN */}
      <ReceiptModal
        isOpen={!!completedOrder}
        onClose={() => setCompletedOrder(null)}
        order={completedOrder}
        onNewTransaction={() => {
          setCompletedOrder(null);
          barcodeInputRef.current?.focus();
        }}
      />

      {/* 6. MODALS SHIFT KASIR & HOLD CART */}
      <StartShiftModal
        isOpen={isStartShiftModalOpen}
        onClose={() => setIsStartShiftModalOpen(false)}
        onSuccess={() => success('Shift kasir berhasil dibuka!')}
      />

      <CloseShiftModal
        isOpen={isCloseShiftModalOpen}
        onClose={() => setIsCloseShiftModalOpen(false)}
        shiftData={currentShift ?? null}
        onSuccess={() => success('Shift kasir berhasil ditutup dan direkonsiliasi!')}
      />

      <HoldCartModal
        isOpen={isHoldCartModalOpen}
        onClose={() => {
          setIsHoldCartModalOpen(false);
          updateHeldCartCount();
        }}
        mode={holdCartMode}
        currentCartItems={cart}
        currentCustomerName={selectedCustomer?.name}
        currentCustomerTier={selectedCustomer?.tier}
        currentSubtotal={subtotal}
        currentDiscount={discountAmount}
        currentTax={0}
        currentTotal={totalAmount}
        onRecallCart={(held) => {
          setCart(held.items);
          setDiscountAmount(held.discountAmount);
          updateHeldCartCount();
          sound.playScanSuccess();
          success(`Keranjang "${held.label}" berhasil dimuat kembali ke kasir!`);
        }}
        onHoldSuccess={() => {
          setCart([]);
          setDiscountAmount(0);
          updateHeldCartCount();
          success('Keranjang berhasil ditahan sementara!');
        }}
      />
    </div>
  );
};
