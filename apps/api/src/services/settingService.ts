import { prisma } from '../config/prisma';

export class SettingService {
  /**
   * Ambil informasi profil toko dan setting struk
   */
  static async getSettings() {
    let setting = await prisma.storeSetting.findUnique({
      where: { id: 1 },
    });

    if (!setting) {
      setting = await prisma.storeSetting.create({
        data: {
          id: 1,
          storeName: 'GrosirPOS Sembako Nusantara',
          tagline: 'Pusat Kulakan & Eceran Sembako Murah',
          address: 'Jl. Pasar Induk Kramat Jati Blok C No. 12-14, Jakarta Timur',
          phone: '0812-3456-7890',
          footerReceipt: 'Terima kasih atas kunjungan Anda!\nBarang yang sudah dibeli tidak dapat ditukar/dikembalikan kecuali rusak saat diterima.',
          paperSize: '58mm',
        },
      });
    }

    return setting;
  }

  /**
   * Update profil toko dan setting struk (Owner only)
   */
  static async updateSettings(data: {
    storeName: string;
    tagline?: string;
    address?: string;
    phone?: string;
    footerReceipt?: string;
    paperSize?: '58mm' | '80mm';
  }) {
    const setting = await prisma.storeSetting.upsert({
      where: { id: 1 },
      update: {
        storeName: data.storeName,
        tagline: data.tagline || null,
        address: data.address || null,
        phone: data.phone || null,
        footerReceipt: data.footerReceipt || null,
        paperSize: data.paperSize || '58mm',
      },
      create: {
        id: 1,
        storeName: data.storeName,
        tagline: data.tagline || null,
        address: data.address || null,
        phone: data.phone || null,
        footerReceipt: data.footerReceipt || null,
        paperSize: data.paperSize || '58mm',
      },
    });

    return setting;
  }
}
