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
  Gift,
  Tag,
} from 'lucide-react';
import { api } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
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
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    name: string;
    discountAmount: number;
  } | null>(null);
  const [isCheckingCoupon, setIsCheckingCoupon] = useState(false);

  // 4. State for Shift & Hold Cart
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

  // Fetch Wholesale Customers
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['customers-pos'],
    queryFn: async () => {
      const res = await api.get('/customers');
      return res.data.data;
    },
  });

  // Fetch Products for POS Catalog
  const { data: catalogProducts = [], isLoading: isCatalogLoading } = useQuery<Product[]>({
    queryKey: ['pos-catalog', catalogSearch, selectedCategoryId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (catalogSearch) params.append('search', catalogSearch);
      if (selectedCategoryId) params.append('categoryId', selectedCategoryId.toString());
      params.append('status', 'active');
      params.append('limit', '40');

      const res = await api.get(`/products?${params.toString()}`);
      return res.data.data;
    },
  });

  // Barcode Lookup Handler
  const handleBarcodeLookup = async (code: string) => {
    const cleanCode = code.trim();
    if (!cleanCode) return;

    try {
      const res = await api.get(`/pos/lookup/${encodeURIComponent(cleanCode)}`);
      const { product, matchedUnit } = res.data.data as {
        product: Product;
        matchedUnit: ProductUnit;
      };

      addItemToCart(product, matchedUnit);
      sound.playScanSuccess();
      setBarcodeInput('');
      barcodeInputRef.current?.focus();
    } catch (err: any) {
      sound.playScanError();
      toastError(err.response?.data?.error?.message || `Barcode "${cleanCode}" tidak ditemukan.`);
      setBarcodeInput('');
      barcodeInputRef.current?.focus();
    }
  };

  // Helper to compute unit price with Volume Tier (Diskon Bertingkat Grosir)
  const computeUnitPrice = (unit: ProductUnit, quantity: number, tier: 'REGULAR' | 'GROSIR') => {
    // 1. Check if Volume Tier applies
    if (unit.priceTiers && unit.priceTiers.length > 0) {
      const matchingTier = [...unit.priceTiers]
        .sort((a, b) => Number(b.minQuantity) - Number(a.minQuantity))
        .find((t) => quantity >= Number(t.minQuantity));
      if (matchingTier) {
        return Number(matchingTier.price);
      }
    }

    // 2. Customer tier wholesale price fallback
    if (tier === 'GROSIR' && unit.wholesalePrice && Number(unit.wholesalePrice) > 0) {
      return Number(unit.wholesalePrice);
    }

    return Number(unit.price);
  };

  // Add Item to Cart
  const addItemToCart = (product: Product, unit: ProductUnit, quantity: number = 1) => {
    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.productId === product.id && item.selectedUnit.id === unit.id
      );

      if (existingIndex > -1) {
        const next = [...prev];
        const newQty = next[existingIndex].quantity + quantity;
        const unitPrice = computeUnitPrice(unit, newQty, customerTier);
        next[existingIndex] = {
          ...next[existingIndex],
          quantity: newQty,
          unitPrice,
          subtotal: newQty * unitPrice,
        };
        return next;
      }

      const unitPrice = computeUnitPrice(unit, quantity, customerTier);
      const newItem: CartItem = {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        barcode: product.barcode,
        currentStock: Number(product.currentStock),
        baseUnit: product.baseUnit,
        selectedUnit: unit,
        availableUnits: product.units,
        quantity,
        unitPrice,
        subtotal: quantity * unitPrice,
      };

      return [newItem, ...prev];
    });
  };

  // Add product directly from catalog card
  const addProductToCart = (product: Product) => {
    const defaultUnit = product.units.find((u) => u.isBaseUnit) || product.units[0];
    if (defaultUnit) {
      addItemToCart(product, defaultUnit, 1);
    }
  };

  // Change Unit for a Cart Item
  const handleUnitChange = (index: number, newUnitId: number) => {
    setCart((prev) => {
      const next = [...prev];
      const item = next[index];
      const newUnit = item.availableUnits.find((u) => u.id === newUnitId);
      if (!newUnit) return prev;

      const unitPrice = computeUnitPrice(newUnit, item.quantity, customerTier);

      next[index] = {
        ...item,
        selectedUnit: newUnit,
        unitPrice,
        subtotal: item.quantity * unitPrice,
      };
      return next;
    });
  };

  // Change Quantity
  const handleQuantityChange = (index: number, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(index);
      return;
    }
    setCart((prev) => {
      const next = [...prev];
      const item = next[index];
      const unitPrice = computeUnitPrice(item.selectedUnit, newQty, customerTier);
      next[index] = {
        ...next[index],
        quantity: newQty,
        unitPrice,
        subtotal: newQty * unitPrice,
      };
      return next;
    });
  };

  // Remove Item
  const handleRemoveItem = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  // Switch Customer Tier
  const handleCustomerTierChange = (tier: 'REGULAR' | 'GROSIR') => {
    setCustomerTier(tier);
    setCart((prev) =>
      prev.map((item) => {
        const unitPrice = computeUnitPrice(item.selectedUnit, item.quantity, tier);
        return {
          ...item,
          unitPrice,
          subtotal: item.quantity * unitPrice,
        };
      })
    );
  };

  // Calculations
  const subtotal = cart.reduce((acc, item) => acc + item.subtotal, 0);
  const totalAmount = Math.max(0, subtotal - discountAmount);
  const changeAmount = paymentMethod === 'CASH' ? Math.max(0, amountPaid - totalAmount) : 0;

  // Coupon promo application handler
  const handleApplyCoupon = async (codeToApply?: string) => {
    const code = (codeToApply || couponCodeInput).trim().toUpperCase();
    if (!code) return;

    try {
      setIsCheckingCoupon(true);
      const res = await api.post('/promotions/validate', {
        code,
        subtotal,
      });
      const promoData = res.data.data;
      setAppliedCoupon({
        code: promoData.promoCode,
        name: promoData.name,
        discountAmount: promoData.discountAmount,
      });
      setDiscountAmount(promoData.discountAmount);
      sound.playScanSuccess();
      success(`Kupon "${promoData.promoCode}" berhasil diterapkan! Potongan: ${formatRupiah(promoData.discountAmount)}`);
    } catch (err: any) {
      sound.playScanError();
      toastError(err.response?.data?.error?.message || err.message || 'Kupon tidak valid.');
    } finally {
      setIsCheckingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setDiscountAmount(0);
    setCouponCodeInput('');
  };

  // Open Payment Modal
  const openPaymentModal = () => {
    if (cart.length === 0) return;

    // Check insufficient stock
    for (const item of cart) {
      const totalBaseUnitsNeeded = item.quantity * Number(item.selectedUnit.conversionFactor);
      if (totalBaseUnitsNeeded > item.currentStock) {
        sound.playScanError();
        toastError(
          `Stok "${item.productName}" tidak cukup! Butuh ${formatNumber(totalBaseUnitsNeeded)} ${item.baseUnit}, stok hanya ${formatNumber(item.currentStock)} ${item.baseUnit}.`
        );
        return;
      }
    }

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
        promoCode: appliedCoupon ? appliedCoupon.code : undefined,
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
      setAppliedCoupon(null);
      setCouponCodeInput('');
      setOrderNotes('');
    },
    onError: (err: any) => {
      sound.playScanError();
      toastError(err.message || 'Gagal memproses transaksi.');
    },
  });

  return (
    <div className="h-[calc(100vh-5.5rem)] flex flex-col space-y-3">
      {/* 0. SHIFT & HOLD CART TOOLBAR */}
      <div className="bg-white px-3 py-2 rounded-lg border border-surface-border shadow-xs flex flex-wrap items-center justify-between gap-2 shrink-0 text-xs">
        {/* Left: Shift Info */}
        <div className="flex items-center gap-3">
          {currentShift ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="font-bold text-ink">Shift Aktif: {currentShift.user.name}</span>
              <span className="text-ink-muted hidden sm:inline">•</span>
              <span className="text-ink-muted hidden sm:inline">
                Modal: <span className="font-semibold text-ink font-mono tabular-nums">{formatRupiah(currentShift.startingCash)}</span>
              </span>
              <span className="text-ink-muted hidden sm:inline">•</span>
              <span className="text-ink-muted hidden sm:inline">
                Kas Masuk: <span className="font-semibold text-emerald-700 font-mono tabular-nums">{formatRupiah(currentShift.metrics?.totalCashSales ?? 0)}</span>
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCloseShiftModalOpen(true)}
                className="text-[11px] h-7 px-2.5 ml-1 text-rose-600 border-rose-200 hover:bg-rose-50"
              >
                <Wallet className="w-3 h-3 mr-1" />
                Tutup Shift
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
              <span className="font-medium text-amber-800">Shift kasir belum dibuka</span>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsStartShiftModalOpen(true)}
                className="text-[11px] h-7 px-2.5 ml-1"
              >
                <DollarSign className="w-3 h-3 mr-1" />
                Buka Shift Kasir
              </Button>
            </div>
          )}
        </div>

        {/* Right: Hold Cart Actions */}
        <div className="flex items-center gap-2">
          {cart.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setHoldCartMode('save');
                setIsHoldCartModalOpen(true);
              }}
              className="text-[11px] h-7 px-2.5 text-amber-700 border-amber-300 hover:bg-amber-50"
            >
              <PauseCircle className="w-3.5 h-3.5 mr-1" />
              Tahan Keranjang (Hold)
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setHoldCartMode('list');
              setIsHoldCartModalOpen(true);
            }}
            className="text-[11px] h-7 px-2.5 text-ink hover:bg-surface-muted"
          >
            <Clock className="w-3.5 h-3.5 mr-1 text-ink-muted" />
            Keranjang Tertahan
            {heldCartCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-amber-500 text-white font-bold text-[10px]">
                {heldCartCount}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* 1. TOP BARCODE SCANNER TOOLBAR */}
      <div className="bg-white p-3 rounded-lg border border-surface-border shadow-xs flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex-1 min-w-[280px] max-w-xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleBarcodeLookup(barcodeInput);
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <Input
                ref={barcodeInputRef}
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="Scan barcode dengan scanner gun (atau tekan Enter)..."
                prefixElement={<Barcode className="w-5 h-5 text-brand-600" />}
                className="font-mono text-base font-semibold"
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="shrink-0"
            >
              Input Barcode
            </Button>
          </form>
        </div>

        {/* Camera Scanner Button & Status */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="md"
            leftIcon={<Camera className="w-4 h-4 text-brand-600" />}
            onClick={() => setIsCameraModalOpen(true)}
            title="Scan menggunakan kamera perangkat (F8)"
          >
            Scan Kamera (F8)
          </Button>

          <div className="hidden md:flex items-center gap-1.5 px-3 py-2 bg-surface-muted border border-surface-border rounded-md text-xs text-ink-muted">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-ink">Scanner Hardware Ready</span>
          </div>
        </div>
      </div>

      {/* Tablet Portrait Tabs Toggle */}
      <div className="lg:hidden flex bg-white border border-surface-border rounded-lg p-1 shrink-0">
        <button
          onClick={() => setActiveTabletTab('catalog')}
          className={`flex-1 py-2 text-xs font-bold rounded-md transition-colors flex items-center justify-center gap-2 ${
            activeTabletTab === 'catalog'
              ? 'bg-brand-500 text-white shadow-xs'
              : 'text-ink-muted hover:text-ink'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Katalog Barang</span>
        </button>
        <button
          onClick={() => setActiveTabletTab('cart')}
          className={`flex-1 py-2 text-xs font-bold rounded-md transition-colors flex items-center justify-center gap-2 ${
            activeTabletTab === 'cart'
              ? 'bg-brand-500 text-white shadow-xs'
              : 'text-ink-muted hover:text-ink'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>Keranjang Kasir ({cart.length})</span>
          {cart.length > 0 && (
            <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.5 rounded-full font-mono tabular-nums">
              {formatRupiah(totalAmount)}
            </span>
          )}
        </button>
      </div>

      {/* 2. MAIN POS WORKSPACE (2-COLUMN GRID) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0 overflow-hidden">
        {/* LEFT COLUMN: CATALOG & QUICK PRODUCT SELECTION */}
        <div
          className={`lg:col-span-7 flex flex-col bg-white rounded-lg border border-surface-border shadow-xs overflow-hidden ${
            activeTabletTab === 'catalog' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {/* Catalog Search & Category Filters Header */}
          <div className="p-3 border-b border-surface-border space-y-2.5 shrink-0 bg-white">
            <div className="relative">
              <Input
                placeholder="Cari barang berdasarkan nama atau barcode (F2)..."
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                prefixElement={<Search className="w-4 h-4 text-ink-muted" />}
              />
            </div>

            {/* Category horizontal scroll pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <button
                onClick={() => setSelectedCategoryId(null)}
                className={`px-3 py-1.5 rounded-full font-semibold transition-colors whitespace-nowrap min-h-[32px] ${
                  selectedCategoryId === null
                    ? 'bg-brand-500 text-white'
                    : 'bg-surface-subtle text-ink hover:bg-gray-200'
                }`}
              >
                Semua Kategori
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`px-3 py-1.5 rounded-full font-semibold transition-colors whitespace-nowrap min-h-[32px] ${
                    selectedCategoryId === cat.id
                      ? 'bg-brand-500 text-white'
                      : 'bg-surface-subtle text-ink hover:bg-gray-200'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Product Cards Grid */}
          <div className="flex-1 p-3 overflow-y-auto">
            {isCatalogLoading ? (
              <div className="py-20 text-center text-ink-muted text-xs">
                <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <span>Memuat produk sembako...</span>
              </div>
            ) : catalogProducts.length === 0 ? (
              <div className="py-16 text-center text-ink-muted text-xs">
                <Package className="w-10 h-10 mx-auto text-ink-subtle opacity-50 mb-2" />
                <p className="font-semibold text-ink">Tidak ada produk ditemukan</p>
                <p>Coba kata kunci pencarian atau kategori lain.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
                {catalogProducts.map((prod) => {
                  const stockNum = Number(prod.currentStock);
                  const isOut = stockNum <= 0;
                  const baseUnit = prod.units.find((u) => u.isBaseUnit) || prod.units[0];
                  const displayPrice =
                    customerTier === 'GROSIR' && baseUnit?.wholesalePrice && Number(baseUnit.wholesalePrice) > 0
                      ? Number(baseUnit.wholesalePrice)
                      : Number(baseUnit?.price || 0);

                  return (
                    <button
                      key={prod.id}
                      type="button"
                      disabled={isOut}
                      onClick={() => addProductToCart(prod)}
                      className={`p-3 rounded-lg border text-left flex flex-col justify-between transition-all select-none min-h-[115px] ${
                        isOut
                          ? 'bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed'
                          : 'bg-white border-surface-border hover:border-brand-500 hover:shadow-xs active:scale-98'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 text-[10px] text-ink-muted mb-0.5">
                          <span className="font-mono">{prod.barcode || prod.sku}</span>
                          <span
                            className={`font-bold tabular-nums ${
                              isOut
                                ? 'text-rose-600'
                                : stockNum <= Number(prod.minStock)
                                ? 'text-amber-600'
                                : 'text-emerald-700'
                            }`}
                          >
                            Stok: {formatNumber(stockNum)} {prod.baseUnit}
                          </span>
                        </div>
                        <h4 className="font-bold text-xs text-ink line-clamp-2 leading-tight">
                          {prod.name}
                        </h4>

                        {/* Bundling & Tier Badges */}
                        <div className="flex flex-wrap items-center gap-1 mt-1">
                          {prod.isBundle && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              <Gift className="w-2.5 h-2.5 text-emerald-600" />
                              Paket
                            </span>
                          )}
                          {baseUnit?.priceTiers && baseUnit.priceTiers.length > 0 && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                              <Tag className="w-2.5 h-2.5 text-amber-600" />
                              Tier Grosir
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-2 pt-1 border-t border-surface-border/60 flex items-center justify-between">
                        <span className="font-extrabold text-xs text-brand-600 font-mono tabular-nums">
                          {formatRupiah(displayPrice)}
                        </span>
                        <span className="text-[10px] text-ink-muted font-medium bg-surface-subtle px-1.5 py-0.5 rounded">
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
          className={`lg:col-span-5 flex flex-col bg-white rounded-lg border border-surface-border shadow-xs overflow-hidden ${
            activeTabletTab === 'cart' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {/* Cart Header & Customer Tier Toggle */}
          <div className="p-3 border-b border-surface-border bg-surface-muted/50 flex flex-col gap-2 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-brand-600" />
                <h3 className="text-sm font-bold text-ink">Keranjang Penjualan</h3>
                <span className="bg-brand-100 text-brand-800 text-xs font-black px-2 py-0.5 rounded-full">
                  {cart.length} item
                </span>
              </div>

              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCart([])}
                  className="text-xs text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1 p-1 hover:bg-rose-50 rounded"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Kosongkan</span>
                </button>
              )}
            </div>

            {/* Customer Tier selector */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleCustomerTierChange('REGULAR')}
                className={`py-1.5 px-3 rounded-md text-xs font-bold border transition-colors flex items-center justify-center gap-1.5 ${
                  customerTier === 'REGULAR'
                    ? 'bg-white border-brand-500 text-brand-700 shadow-xs ring-1 ring-brand-500'
                    : 'bg-surface-subtle border-surface-border text-ink-muted hover:text-ink'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Eceran (Umum)</span>
              </button>

              <button
                type="button"
                onClick={() => handleCustomerTierChange('GROSIR')}
                className={`py-1.5 px-3 rounded-md text-xs font-bold border transition-colors flex items-center justify-center gap-1.5 ${
                  customerTier === 'GROSIR'
                    ? 'bg-brand-500 text-white border-brand-600 shadow-xs'
                    : 'bg-surface-subtle border-surface-border text-ink-muted hover:text-ink'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>Harga Grosir / Partai</span>
              </button>
            </div>

            {/* Customer dropdown if Grosir tier is active */}
            {customerTier === 'GROSIR' && (
              <div className="pt-1">
                <select
                  value={selectedCustomerId || ''}
                  onChange={(e) =>
                    setSelectedCustomerId(e.target.value ? Number(e.target.value) : null)
                  }
                  className="w-full text-xs font-semibold bg-white border border-brand-300 rounded px-2.5 py-1.5 text-brand-900 focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  <option value="">-- Pilih Toko / Pelanggan Bon Tempo --</option>
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
          <div className="flex-1 p-3 overflow-y-auto divide-y divide-surface-border">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center py-12 text-center text-ink-muted text-xs space-y-2">
                <ShoppingCart className="w-12 h-12 text-ink-subtle opacity-40" />
                <p className="font-semibold text-sm text-ink">Keranjang Kasir Masih Kosong</p>
                <p className="max-w-xs text-ink-muted">
                  Scan barcode barang atau klik produk dari katalog sebelah kiri untuk memulai transaksi.
                </p>
              </div>
            ) : (
              cart.map((item, index) => {
                const totalBaseUnitsNeeded = item.quantity * Number(item.selectedUnit.conversionFactor);
                const isOverStock = totalBaseUnitsNeeded > item.currentStock;

                return (
                  <div key={`${item.productId}-${item.selectedUnit.id}`} className="py-2.5 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h4 className="font-bold text-xs text-ink leading-tight">
                          {item.productName}
                        </h4>
                        <div className="text-[10px] text-ink-muted font-mono">{item.barcode || item.sku}</div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="text-ink-subtle hover:text-rose-600 p-1 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      {/* Unit Selector */}
                      <div className="flex items-center gap-1.5">
                        <select
                          value={item.selectedUnit.id}
                          onChange={(e) => handleUnitChange(index, Number(e.target.value))}
                          className="bg-surface-subtle text-ink font-semibold text-xs rounded border border-surface-border px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        >
                          {item.availableUnits.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.unitName} (x{formatNumber(u.conversionFactor)})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center border border-surface-border rounded-md overflow-hidden bg-white">
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(index, item.quantity - 1)}
                          className="p-1.5 text-ink-muted hover:text-ink hover:bg-surface-subtle transition-colors min-h-[30px] min-w-[30px] flex items-center justify-center"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <input
                          type="number"
                          step="any"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            handleQuantityChange(index, parseFloat(e.target.value) || 0)
                          }
                          className="w-12 text-center text-xs font-bold text-ink py-1 focus:outline-none font-mono tabular-nums"
                        />
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(index, item.quantity + 1)}
                          className="p-1.5 text-ink-muted hover:text-ink hover:bg-surface-subtle transition-colors min-h-[30px] min-w-[30px] flex items-center justify-center"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Subtotal */}
                      <div className="text-right">
                        <div className="font-extrabold text-xs text-brand-600 font-mono tabular-nums">
                          {formatRupiah(item.subtotal)}
                        </div>
                        <div className="text-[10px] text-ink-muted font-mono tabular-nums">
                          @{formatRupiah(item.unitPrice)}
                        </div>
                        {item.selectedUnit.priceTiers && item.selectedUnit.priceTiers.some((t) => item.quantity >= Number(t.minQuantity)) && (
                          <span className="inline-block mt-0.5 text-[9px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            Tier Grosir Aktif
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stock Alert Warning if insufficient */}
                    {isOverStock && (
                      <div className="bg-rose-50 border border-rose-200 text-rose-700 text-[10px] p-1.5 rounded flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          Stok tidak mencukupi! Butuh {formatNumber(totalBaseUnitsNeeded)}{' '}
                          {item.baseUnit}, stok fisik hanya {formatNumber(item.currentStock)}{' '}
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
          <div className="p-3.5 bg-surface-muted/60 border-t border-surface-border space-y-2.5 shrink-0">
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-ink-muted">
                <span>Subtotal ({cart.length} item)</span>
                <span className="font-bold text-ink font-mono tabular-nums">{formatRupiah(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Diskon</span>
                  <span className="font-mono tabular-nums">-{formatRupiah(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-ink pt-1 border-t border-surface-border">
                <span>Total Tagihan:</span>
                <span className="text-brand-600 text-base font-mono tabular-nums">{formatRupiah(totalAmount)}</span>
              </div>
            </div>

            <Button
              type="button"
              variant="primary"
              size="lg"
              disabled={cart.length === 0}
              onClick={openPaymentModal}
              className="w-full font-bold shadow-md text-base"
              leftIcon={<CreditCard className="w-5 h-5" />}
            >
              Bayar Sekarang (F4) — {formatRupiah(totalAmount)}
            </Button>
          </div>
        </div>
      </div>

      {/* 3. MODAL PEMBAYARAN KASIR */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="Pembayaran Transaksi Kasir"
        description="Pilih metode pembayaran dan masukkan nominal uang yang diterima."
        size="md"
      >
        <div className="space-y-4">
          {/* Total Tagihan Banner */}
          <div className="p-4 bg-brand-50 border border-brand-200 rounded-lg text-center space-y-0.5">
            <span className="text-xs font-bold text-brand-800 uppercase tracking-wider">
              Total yang Harus Dibayar
            </span>
            <div className="text-3xl font-black text-brand-600 font-mono tabular-nums">{formatRupiah(totalAmount)}</div>
          </div>

          {/* Metode Pembayaran Tabs */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-ink uppercase tracking-wider">
              Metode Pembayaran
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['CASH', 'QRIS', 'TRANSFER', 'TEMPO'] as PaymentMethod[]).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  className={`py-2 px-1 text-xs font-bold rounded-md border text-center transition-colors ${
                    paymentMethod === method
                      ? 'bg-brand-500 text-white border-brand-600 shadow-xs'
                      : 'bg-surface-subtle border-surface-border text-ink hover:bg-gray-200'
                  }`}
                >
                  {method === 'TEMPO' ? 'Tempo / Bon' : method}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Cash Presets */}
          {paymentMethod === 'CASH' && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-ink uppercase tracking-wider">
                  <span>Pilihan Cepat Nominal</span>
                  <button
                    type="button"
                    onClick={() => setAmountPaid(totalAmount)}
                    className="text-brand-600 hover:underline normal-case font-semibold"
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
                          ? 'bg-brand-500 text-white border-brand-600 font-bold'
                          : 'bg-surface-subtle border-surface-border text-ink hover:bg-gray-200'
                      }`}
                    >
                      {formatRupiah(amt)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1">
                  Uang Tunai Diterima (Rp)
                </label>
                <input
                  type="number"
                  value={amountPaid || ''}
                  onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full bg-surface-subtle border border-surface-border rounded-md px-3 py-2 text-xl font-mono font-bold text-ink focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              {/* Kembalian calculation banner */}
              <div className="p-3 bg-surface-muted rounded-lg border border-surface-border flex items-center justify-between">
                <span className="text-xs font-medium text-ink-muted">Kembalian:</span>
                <span
                  className={`text-lg font-black font-mono tabular-nums ${
                    amountPaid < totalAmount ? 'text-rose-600' : 'text-brand-600'
                  }`}
                >
                  {amountPaid < totalAmount
                    ? `Kurang ${formatRupiah(totalAmount - amountPaid)}`
                    : formatRupiah(changeAmount)}
                </span>
              </div>
            </div>
          )}

          {/* Voucher / Kupon Promosi */}
          <div className="p-3 rounded-lg border border-brand-200 bg-brand-50/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-brand-800 uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-brand-600" />
                Voucher / Kupon Promosi
              </span>
              {appliedCoupon && (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                  Kupon Aktif
                </span>
              )}
            </div>

            {appliedCoupon ? (
              <div className="flex items-center justify-between p-2 rounded bg-white border border-brand-200 text-xs">
                <div>
                  <span className="font-mono font-bold text-brand-700">{appliedCoupon.code}</span>
                  <span className="text-ink-muted ml-2 text-[11px]">({appliedCoupon.name})</span>
                  <div className="text-[11px] font-semibold text-emerald-700">
                    Potongan: {formatRupiah(appliedCoupon.discountAmount)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveCoupon}
                  className="text-ink-subtle hover:text-rose-600 text-xs font-semibold px-2 py-1 rounded"
                >
                  Hapus
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="KODE VOUCHER (MISAL: SEMBAKOMURAH)"
                  value={couponCodeInput}
                  onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                  className="flex-1 bg-white border border-surface-border rounded px-2.5 py-1.5 text-xs font-mono uppercase font-bold text-ink focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleApplyCoupon()}
                  disabled={isCheckingCoupon || !couponCodeInput.trim()}
                  className="h-8 text-xs shrink-0 text-brand-700 border-brand-300 hover:bg-brand-50"
                >
                  {isCheckingCoupon ? 'Cek...' : 'Terapkan'}
                </Button>
              </div>
            )}
          </div>

          {/* Diskon / Catatan Tambahan */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-surface-border">
            <div>
              <label className="block text-[11px] font-bold text-ink uppercase mb-1">
                Potongan Diskon (Rp)
              </label>
              <input
                type="number"
                min="0"
                value={discountAmount || ''}
                onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-full bg-surface-subtle border border-surface-border rounded px-2.5 py-1.5 text-xs font-bold text-ink focus:outline-none focus:ring-1 focus:ring-brand-500 font-mono tabular-nums"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-ink uppercase mb-1">
                Catatan Transaksi
              </label>
              <input
                type="text"
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="Contoh: Titip di warung"
                className="w-full bg-surface-subtle border border-surface-border rounded px-2.5 py-1.5 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t border-surface-border flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setIsPaymentModalOpen(false)}
              disabled={checkoutMutation.isPending}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="primary"
              size="md"
              disabled={paymentMethod === 'CASH' && amountPaid < totalAmount}
              isLoading={checkoutMutation.isPending}
              onClick={() => checkoutMutation.mutate()}
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
            >
              Selesaikan Transaksi & Cetak Struk
            </Button>
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
      />

      <CloseShiftModal
        isOpen={isCloseShiftModalOpen}
        onClose={() => setIsCloseShiftModalOpen(false)}
        shiftData={currentShift ?? null}
      />

      <HoldCartModal
        isOpen={isHoldCartModalOpen}
        onClose={() => setIsHoldCartModalOpen(false)}
        mode={holdCartMode}
        currentCartItems={cart}
        currentCustomerTier={customerTier}
        currentSubtotal={subtotal}
        currentDiscount={discountAmount}
        currentTotal={totalAmount}
        onRecallCart={(heldCart) => {
          setCart(heldCart.items);
          setDiscountAmount(heldCart.discountAmount || 0);
          updateHeldCartCount();
        }}
        onHoldSuccess={() => {
          setCart([]);
          setDiscountAmount(0);
          updateHeldCartCount();
        }}
      />
    </div>
  );
};
