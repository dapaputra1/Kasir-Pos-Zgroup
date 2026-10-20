import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CreditCard,
  CheckCircle,
  DollarSign,
  PackageCheck,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { api } from '../../lib/api';
import { formatRupiah, formatNumber } from '../../lib/utils';
import { Purchase } from '../../types/supplier';

interface PurchaseDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseId: number | null;
  onOpenPayment?: (purchase: Purchase) => void;
}

export const PurchaseDetailModal: React.FC<PurchaseDetailModalProps> = ({
  isOpen,
  onClose,
  purchaseId,
  onOpenPayment,
}) => {
  const { data: purchase, isLoading } = useQuery<Purchase>({
    queryKey: ['purchase-detail', purchaseId],
    queryFn: async () => {
      const res = await api.get(`/purchases/${purchaseId}`);
      return res.data.data;
    },
    enabled: isOpen && !!purchaseId,
  });

  if (!isOpen) return null;

  const total = Number(purchase?.totalAmount || 0);
  const paid = Number(purchase?.amountPaid || 0);
  const remaining = Math.max(0, total - paid);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={purchase ? `Faktur Pembelian: ${purchase.purchaseNumber}` : 'Detail Faktur Pembelian'}
      size="xl"
    >
      {isLoading ? (
        <div className="py-12 text-center text-gray-400">Memuat detail faktur...</div>
      ) : !purchase ? (
        <div className="py-12 text-center text-rose-500">Faktur pembelian tidak ditemukan.</div>
      ) : (
        <div className="space-y-6">
          {/* Header Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-gray-50 border border-gray-200 text-xs">
            {/* Column 1: Supplier */}
            <div className="space-y-1">
              <span className="font-bold text-gray-500 uppercase tracking-wider block">Supplier</span>
              <p className="font-bold text-sm text-gray-900">{purchase.supplier?.name}</p>
              <p className="text-gray-600">Kontak: {purchase.supplier?.contactPerson || '-'}</p>
              <p className="text-gray-600">Telp: {purchase.supplier?.phone || '-'}</p>
            </div>

            {/* Column 2: Invoice & Date */}
            <div className="space-y-1">
              <span className="font-bold text-gray-500 uppercase tracking-wider block">Faktur & Tanggal</span>
              <p className="text-gray-700">
                No. SJ Supplier: <span className="font-semibold text-gray-900">{purchase.supplierInvoiceNo || '-'}</span>
              </p>
              <p className="text-gray-700">
                Tanggal Masuk: <span className="font-semibold text-gray-900">{new Date(purchase.purchaseDate).toLocaleDateString('id-ID', { dateStyle: 'long' })}</span>
              </p>
              <p className="text-gray-700">
                Penerima: <span className="font-semibold text-gray-900">{purchase.user?.name} ({purchase.user?.role})</span>
              </p>
            </div>

            {/* Column 3: Payment status */}
            <div className="space-y-1">
              <span className="font-bold text-gray-500 uppercase tracking-wider block">Status Pembayaran</span>
              <p className="text-gray-700">
                Sistem: <span className="font-semibold text-gray-900">{purchase.paymentType === 'CASH' ? 'Tunai (Cash)' : 'Tempo (Hutang Dagang)'}</span>
              </p>
              {purchase.paymentType === 'TEMPO' && purchase.dueDate && (
                <p className="text-amber-800 font-medium">
                  Jatuh Tempo: {new Date(purchase.dueDate).toLocaleDateString('id-ID')}
                </p>
              )}
              {remaining > 0 ? (
                <p className="text-rose-600 font-bold">
                  Sisa Hutang: {formatRupiah(remaining)}
                </p>
              ) : (
                <p className="text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> Lunas Sepenuhnya
                </p>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div>
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-2">
              <PackageCheck className="w-4 h-4 text-brand-600" />
              <span>Rincian Barang yang Diterima</span>
            </h4>
            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-100/90 text-gray-700 font-semibold border-b border-gray-200">
                  <tr>
                    <th className="py-2.5 px-3">Produk Sembako</th>
                    <th className="py-2.5 px-3">Satuan Kulakan</th>
                    <th className="py-2.5 px-3 text-center">Qty Beli</th>
                    <th className="py-2.5 px-3 text-center">Masuk Stok Fisik</th>
                    <th className="py-2.5 px-3 text-right">Harga Beli / Unit</th>
                    <th className="py-2.5 px-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {purchase.items?.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/60">
                      <td className="p-3">
                        <div className="font-semibold text-gray-900">{item.productName}</div>
                        <div className="text-[11px] text-gray-400 font-mono">{item.sku}</div>
                      </td>
                      <td className="p-3 text-gray-700 font-medium">{item.unitName}</td>
                      <td className="p-3 text-center font-bold text-gray-900">
                        {formatNumber(item.quantity)}
                      </td>
                      <td className="p-3 text-center text-brand-700 font-semibold">
                        +{formatNumber(item.baseQuantity)} {item.product?.baseUnit || ''}
                      </td>
                      <td className="p-3 text-right text-gray-700">
                        {formatRupiah(item.unitCost)}
                      </td>
                      <td className="p-3 text-right font-bold text-gray-900">
                        {formatRupiah(item.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Financial Breakdown */}
          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            {/* Notes / Remarks */}
            <div className="w-full md:w-1/2 p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs">
              <span className="font-semibold text-gray-700 block mb-1">Catatan Faktur:</span>
              <p className="text-gray-600 italic">
                {purchase.notes || 'Tidak ada catatan tambahan.'}
              </p>
            </div>

            {/* Calculations Table */}
            <div className="w-full md:w-5/12 text-xs space-y-2">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal Barang:</span>
                <span className="font-semibold text-gray-900">{formatRupiah(purchase.subtotal)}</span>
              </div>
              {Number(purchase.discountAmount) > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Diskon / Potongan:</span>
                  <span className="font-semibold">-{formatRupiah(purchase.discountAmount)}</span>
                </div>
              )}
              {Number(purchase.taxAmount) > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Pajak / Ongkos Kirim:</span>
                  <span className="font-semibold">+{formatRupiah(purchase.taxAmount)}</span>
                </div>
              )}
              <div className="pt-2 border-t border-gray-200 flex justify-between items-center text-sm">
                <span className="font-bold text-gray-900">Total Faktur Kulakan:</span>
                <span className="font-black text-brand-700 text-base">{formatRupiah(total)}</span>
              </div>
              <div className="flex justify-between text-gray-700 font-medium">
                <span>Sudah Dibayar:</span>
                <span className="text-emerald-700">{formatRupiah(paid)}</span>
              </div>
              {remaining > 0 && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 flex justify-between items-center font-bold text-rose-800">
                  <span>Sisa Hutang Tempo:</span>
                  <span>{formatRupiah(remaining)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Payment History (if any) */}
          {purchase.payments && purchase.payments.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span>Riwayat Pelunasan Hutang</span>
              </h4>
              <div className="border border-gray-200 rounded-lg overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                    <tr>
                      <th className="py-2 px-3">Tanggal</th>
                      <th className="py-2 px-3">Metode</th>
                      <th className="py-2 px-3">Catatan / Bukti</th>
                      <th className="py-2 px-3 text-right">Nominal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {purchase.payments.map((p) => (
                      <tr key={p.id}>
                        <td className="py-2 px-3">
                          {new Date(p.paymentDate).toLocaleDateString('id-ID', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </td>
                        <td className="py-2 px-3 font-medium text-gray-700">{p.paymentMethod}</td>
                        <td className="py-2 px-3 text-gray-600 italic">{p.note || '-'}</td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-700">
                          {formatRupiah(p.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Footer Action */}
          <div className="flex justify-between items-center pt-4 border-t border-gray-200">
            <div>
              {remaining > 0 && onOpenPayment && (
                <Button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenPayment(purchase);
                  }}
                  className="bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1.5"
                >
                  <DollarSign className="w-4 h-4" />
                  <span>Bayar Hutang ({formatRupiah(remaining)})</span>
                </Button>
              )}
            </div>
            <Button type="button" variant="outline" onClick={onClose}>
              Tutup
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
