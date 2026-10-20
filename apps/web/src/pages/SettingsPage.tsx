import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Store,
  Printer,
  Save,
  FileText,
  Phone,
  MapPin,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { useToast } from '../components/ui/Toast';
import { api } from '../lib/api';
import { StoreSetting, UpdateStoreSettingInput } from '../types/setting';

export const SettingsPage: React.FC = () => {
  const { success, error: toastError } = useToast();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<UpdateStoreSettingInput>({
    storeName: '',
    tagline: '',
    address: '',
    phone: '',
    footerReceipt: '',
    paperSize: '58mm',
  });

  const { data: setting } = useQuery<StoreSetting>({
    queryKey: ['store-settings'],
    queryFn: async () => {
      const res = await api.get('/settings');
      return res.data.data;
    },
  });

  useEffect(() => {
    if (setting) {
      setForm({
        storeName: setting.storeName || '',
        tagline: setting.tagline || '',
        address: setting.address || '',
        phone: setting.phone || '',
        footerReceipt: setting.footerReceipt || '',
        paperSize: setting.paperSize || '58mm',
      });
    }
  }, [setting]);

  const updateMutation = useMutation({
    mutationFn: async (payload: UpdateStoreSettingInput) => {
      const res = await api.put('/settings', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-settings'] });
      success('Pengaturan toko dan struk thermal berhasil disimpan!');
    },
    onError: (err: any) => {
      toastError(err.message || 'Gagal menyimpan pengaturan toko.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(form);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
          <Store className="w-7 h-7 text-brand-600" />
          Pengaturan Toko & Struk Kasir
        </h1>
        <p className="text-sm text-ink-muted mt-1">
          Konfigurasi identitas toko grosir, alamat, dan format cetak struk thermal kasir (58mm / 80mm).
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Store Profile & Receipt Config */}
        <div className="lg:col-span-7">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-5 h-5 text-ink-muted" />
                Profil Toko & Preferensi Cetak
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
                    Nama Toko Grosir <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={form.storeName}
                    onChange={(e) => setForm({ ...form, storeName: e.target.value })}
                    placeholder="Contoh: GrosirPOS Sembako Nusantara"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
                    Slogan / Tagline Toko
                  </label>
                  <Input
                    type="text"
                    value={form.tagline || ''}
                    onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                    placeholder="Contoh: Pusat Kulakan Sembako Termurah & Terlengkap"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
                      Nomor Telepon / WhatsApp
                    </label>
                    <Input
                      type="text"
                      value={form.phone || ''}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="Contoh: 0812-3456-7890"
                      prefixElement={<Phone className="w-4 h-4 text-ink-muted" />}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
                      Ukuran Kertas Thermal Kasir
                    </label>
                    <Select
                      value={form.paperSize}
                      onChange={(e) => setForm({ ...form, paperSize: e.target.value as any })}
                      options={[
                        { value: '58mm', label: '58 mm (Printer Kasir Mini Standard)' },
                        { value: '80mm', label: '80 mm (Printer Kasir Lebar / Desktop)' },
                      ]}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
                    Alamat Lengkap Toko
                  </label>
                  <Input
                    type="text"
                    value={form.address || ''}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="Contoh: Jl. Pasar Induk Kramat Jati Blok C No. 12-14, Jakarta"
                    prefixElement={<MapPin className="w-4 h-4 text-ink-muted" />}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
                    Pesan Kaki Struk Kasir (Footer Nota)
                  </label>
                  <textarea
                    rows={3}
                    value={form.footerReceipt || ''}
                    onChange={(e) => setForm({ ...form, footerReceipt: e.target.value })}
                    placeholder="Contoh: Terima kasih atas kunjungan Anda!&#10;Barang yang sudah dibeli tidak dapat ditukar kecuali rusak."
                    className="w-full text-xs p-3 rounded-lg border border-surface-border bg-white text-ink focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
                  />
                  <p className="text-[11px] text-ink-muted mt-1">
                    Gunakan baris baru (Enter) untuk memisahkan baris pesan pada struk thermal.
                  </p>
                </div>

                <div className="pt-4 border-t border-surface-border flex justify-end">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={updateMutation.isPending || !form.storeName.trim()}
                    className="flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {updateMutation.isPending ? 'Menyimpan...' : 'Simpan Pengaturan'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Preview: Live Thermal Receipt Mockup */}
        <div className="lg:col-span-5">
          <Card className="sticky top-6">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Printer className="w-4 h-4 text-ink-muted" />
                Live Preview Struk Kasir ({form.paperSize})
              </CardTitle>
            </CardHeader>
            <CardContent className="bg-slate-100 p-6 flex justify-center">
              {/* Paper Mockup */}
              <div
                className={`bg-[#FCFCFD] border border-gray-300 rounded-lg shadow-md p-5 font-mono text-[11px] text-ink space-y-3 transition-all ${
                  form.paperSize === '80mm' ? 'w-[320px]' : 'w-[260px]'
                }`}
              >
                {/* Header */}
                <div className="text-center pb-2 border-b border-dashed border-gray-400 space-y-0.5">
                  <div className="font-black text-sm uppercase tracking-tight">
                    {form.storeName || 'NAMA TOKO ANDA'}
                  </div>
                  {form.tagline && (
                    <div className="text-[9px] text-gray-500">{form.tagline}</div>
                  )}
                  <div className="text-[9px] text-gray-500">
                    {form.address || 'Alamat Toko Belum Diatur'}
                  </div>
                  {form.phone && (
                    <div className="text-[9px] text-gray-500">Telp: {form.phone}</div>
                  )}
                </div>

                {/* Metadata */}
                <div className="space-y-0.5 text-[10px] text-gray-600 border-b border-dashed border-gray-400 pb-2">
                  <div className="flex justify-between">
                    <span>No: INV-20261019-0001</span>
                    <span>14:35 WIB</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Kasir: Andi Wijaya</span>
                    <span>Pelanggan: Umum</span>
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-1.5 border-b border-dashed border-gray-400 pb-2 text-[10px]">
                  <div>
                    <div className="font-semibold truncate">Beras Ramos Setra Premium 5kg</div>
                    <div className="flex justify-between text-gray-600">
                      <span>2 SAK x Rp 72.000</span>
                      <span className="font-semibold text-ink">Rp 144.000</span>
                    </div>
                  </div>
                  <div>
                    <div className="font-semibold truncate">Minyak Goreng SunCo 2L</div>
                    <div className="flex justify-between text-gray-600">
                      <span>1 DUS (6 PCH) x Rp 205.000</span>
                      <span className="font-semibold text-ink">Rp 205.000</span>
                    </div>
                  </div>
                </div>

                {/* Totals */}
                <div className="space-y-1 text-[10px]">
                  <div className="flex justify-between font-bold text-xs pt-1">
                    <span>TOTAL:</span>
                    <span>Rp 349.000</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Bayar (CASH):</span>
                    <span>Rp 350.000</span>
                  </div>
                  <div className="flex justify-between font-bold text-gray-700">
                    <span>Kembali:</span>
                    <span>Rp 1.000</span>
                  </div>
                </div>

                {/* Footer */}
                <div className="text-center pt-3 border-t border-dashed border-gray-400 text-[9px] text-gray-500 space-y-1">
                  <p className="font-bold text-gray-700">*** TERIMA KASIH ***</p>
                  <p className="whitespace-pre-line leading-relaxed">
                    {form.footerReceipt || 'Barang yang sudah dibeli tidak dapat ditukar/dikembalikan tanpa nota ini.'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
export default SettingsPage;
