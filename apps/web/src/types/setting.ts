export interface StoreSetting {
  id: number;
  storeName: string;
  tagline?: string | null;
  address?: string | null;
  phone?: string | null;
  footerReceipt?: string | null;
  paperSize: '58mm' | '80mm';
  updatedAt: string;
}

export interface UpdateStoreSettingInput {
  storeName: string;
  tagline?: string;
  address?: string;
  phone?: string;
  footerReceipt?: string;
  paperSize: '58mm' | '80mm';
}
