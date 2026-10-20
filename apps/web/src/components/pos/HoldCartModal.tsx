import React, { useState } from 'react';
import { Clock, ShoppingCart, Trash2, ArrowRightCircle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { formatRupiah, formatNumber } from '../../lib/utils';
import { CartItem } from '../../types/pos';

export interface HeldCart {
  id: string;
  label: string;
  customerName: string;
  customerTier: string;
  items: CartItem[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  heldAt: string;
}

interface HoldCartModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'save' | 'list';
  currentCartItems?: CartItem[];
  currentCustomerName?: string;
  currentCustomerTier?: string;
  currentSubtotal?: number;
  currentDiscount?: number;
  currentTax?: number;
  currentTotal?: number;
  onRecallCart: (cart: HeldCart) => void;
  onHoldSuccess?: () => void;
}

export const HoldCartModal: React.FC<HoldCartModalProps> = ({
  isOpen,
  onClose,
  mode,
  currentCartItems = [],
  currentCustomerName = 'Pelanggan Umum (Retail)',
  currentCustomerTier = 'REGULAR',
  currentSubtotal = 0,
  currentDiscount = 0,
  currentTax = 0,
  currentTotal = 0,
  onRecallCart,
  onHoldSuccess,
}) => {
  const [label, setLabel] = useState<string>('');
  const [heldCarts, setHeldCarts] = useState<HeldCart[]>(() => {
    try {
      const stored = localStorage.getItem('grosirpos_held_carts');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Re-read from localStorage when modal opens
  React.useEffect(() => {
    if (isOpen) {
      try {
        const stored = localStorage.getItem('grosirpos_held_carts');
        setHeldCarts(stored ? JSON.parse(stored) : []);
      } catch {
        setHeldCarts([]);
      }
      setLabel('');
    }
  }, [isOpen]);

  const saveToStorage = (carts: HeldCart[]) => {
    setHeldCarts(carts);
    localStorage.setItem('grosirpos_held_carts', JSON.stringify(carts));
  };

  const handleSaveHold = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentCartItems.length === 0) return;

    const newHeldCart: HeldCart = {
      id: `HOLD-${Date.now()}`,
      label: label.trim() || currentCustomerName || 'Pelanggan Tanpa Nama',
      customerName: currentCustomerName,
      customerTier: currentCustomerTier,
      items: currentCartItems,
      subtotal: currentSubtotal,
      discountAmount: currentDiscount,
      taxAmount: currentTax,
      totalAmount: currentTotal,
      heldAt: new Date().toISOString(),
    };

    const updated = [newHeldCart, ...heldCarts];
    saveToStorage(updated);
    onClose();
    if (onHoldSuccess) onHoldSuccess();
  };

  const handleRecall = (cart: HeldCart) => {
    onRecallCart(cart);
    // Remove from held carts
    const filtered = heldCarts.filter((c) => c.id !== cart.id);
    saveToStorage(filtered);
    onClose();
  };

  const handleDelete = (id: string) => {
    const filtered = heldCarts.filter((c) => c.id !== id);
    saveToStorage(filtered);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'save' ? 'Tahan Keranjang (Hold Cart)' : 'Daftar Keranjang Tertahan'}
      size="lg"
    >
      {mode === 'save' ? (
        <form onSubmit={handleSaveHold} className="space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200/60 rounded-lg flex items-start gap-2.5">
            <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed">
              Tahan sementara keranjang belanja pembeli ini agar kasir dapat melayani antrean pembeli lainnya. Anda dapat memanggil kembali (recall) keranjang ini kapan saja.
            </p>
          </div>

          <div className="p-3.5 bg-surface-muted/50 border border-surface-border rounded-lg text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-ink-muted">Jumlah Item:</span>
              <span className="font-semibold text-ink">{currentCartItems.length} Produk</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-muted">Total Belanja:</span>
              <span className="font-bold text-ink">{formatRupiah(currentTotal)}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
              Catatan / Nama Pembeli (Label Keranjang)
            </label>
            <Input
              type="text"
              placeholder="Contoh: Bu Nurul - Ambil Minyak Tambahan"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              autoFocus
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-surface-border">
            <Button type="button" variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white">
              <Clock className="w-4 h-4" />
              Simpan & Tahan Keranjang
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-3">
          {heldCarts.length === 0 ? (
            <div className="py-8 text-center text-ink-muted space-y-2">
              <ShoppingCart className="w-10 h-10 mx-auto text-ink-muted/40" />
              <p className="text-sm font-medium">Tidak ada transaksi yang sedang ditahan.</p>
              <p className="text-xs text-ink-muted">
                Keranjang yang Anda tahan saat kasir sibuk akan muncul di daftar ini.
              </p>
            </div>
          ) : (
            <div className="max-h-[380px] overflow-y-auto space-y-2.5 pr-1">
              {heldCarts.map((cart) => (
                <div
                  key={cart.id}
                  className="p-3.5 border border-surface-border rounded-xl bg-white hover:border-brand-300 transition-all shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-ink flex items-center gap-2">
                        {cart.label}
                        <Badge variant="outline" className="text-[10px]">
                          {formatNumber(cart.items.length)} Item
                        </Badge>
                      </div>
                      <div className="text-[11px] text-ink-muted mt-0.5 flex items-center gap-2">
                        <span>
                          {new Date(cart.heldAt).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}{' '}
                          WIB
                        </span>
                        <span>•</span>
                        <span>{cart.customerName}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-black text-brand-700">
                        {formatRupiah(cart.totalAmount)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 mt-3 pt-2 border-t border-surface-border/60">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(cart.id)}
                      className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50 h-8 px-2.5"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      Hapus
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleRecall(cart)}
                      className="text-xs flex items-center gap-1.5 h-8 px-3"
                    >
                      <ArrowRightCircle className="w-3.5 h-3.5" />
                      Muat ke Kasir (Recall)
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-3 border-t border-surface-border">
            <Button type="button" variant="outline" onClick={onClose}>
              Tutup
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
