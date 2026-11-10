import { prisma } from '../config/prisma';
import { config } from '../config/env';

export interface ExtractedReceiptItem {
  name: string;
  rawName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  subtotal: number;
  baseUnit: string;
  conversionFactor: number;
  categoryName?: string;
  categoryId?: number | null;
  matchedProductId?: number | null;
  matchedProductSku?: string | null;
  isExistingProduct?: boolean;
  suggestedSellingPrice?: number;
  suggestedWholesalePrice?: number;
}

export interface ExtractedReceiptData {
  supplier: {
    id?: number | null;
    name: string;
    phone: string | null;
    address: string | null;
    isExisting?: boolean;
  };
  invoiceNumber: string | null;
  date: string;
  paymentType: 'CASH' | 'TEMPO';
  dueDays: number | null;
  notes: string | null;
  items: ExtractedReceiptItem[];
  totalAmount: number;
}

export interface ReceiptImageInput {
  imageBase64: string;
  mimeType?: string;
}

export class AiReceiptService {
  /**
   * Parse single or multi-page receipt images using Gemini Vision API
   */
  static async scanReceipt(
    imagesInput: string | ReceiptImageInput | Array<string | ReceiptImageInput>,
    defaultMimeType: string = 'image/jpeg',
    userApiKey?: string
  ): Promise<ExtractedReceiptData> {
    const apiKey = (userApiKey || config.geminiApiKey || process.env.GEMINI_API_KEY || '').trim();

    if (!apiKey) {
      const error: any = new Error(
        'Kunci API Gemini diperlukan untuk fitur Scan Nota Otomatis. Silakan masukkan API Key Gemini gratis Anda dari Google AI Studio.'
      );
      error.statusCode = 400;
      error.code = 'GEMINI_KEY_REQUIRED';
      throw error;
    }

    // Normalize imagesInput into array of { cleanBase64, mimeType }
    let imageList: Array<{ cleanBase64: string; mimeType: string }> = [];

    if (Array.isArray(imagesInput)) {
      imageList = imagesInput.map((img) => {
        if (typeof img === 'string') {
          return {
            cleanBase64: img.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, ''),
            mimeType: defaultMimeType,
          };
        }
        return {
          cleanBase64: (img.imageBase64 || '').replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, ''),
          mimeType: img.mimeType || defaultMimeType,
        };
      }).filter((it) => it.cleanBase64.length > 0);
    } else if (typeof imagesInput === 'string') {
      imageList = [
        {
          cleanBase64: imagesInput.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, ''),
          mimeType: defaultMimeType,
        },
      ];
    } else if (imagesInput && typeof imagesInput === 'object') {
      imageList = [
        {
          cleanBase64: (imagesInput.imageBase64 || '').replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, ''),
          mimeType: imagesInput.mimeType || defaultMimeType,
        },
      ];
    }

    if (imageList.length === 0) {
      const error: any = new Error('Tidak ada data foto nota yang valid untuk diproses.');
      error.statusCode = 400;
      throw error;
    }

    const isMultiPage = imageList.length > 1;

    const prompt = `
Anda adalah asisten AI kasir POS grosir sembako Indonesia yang sangat teliti dalam membaca nota faktur pembelian (nota kontan, nota kulakan, surat jalan distributor).
Tugas Anda: Analisis foto nota/faktur pembelian ini (${imageList.length} lembar/gambar) dan ekstrak seluruh datanya ke dalam format JSON yang valid.

${
  isMultiPage
    ? `PENTING (NOTA MULTI-HALAMAN / LEBIH DARI 1 LEMBAR):
- Foto yang diberikan terdiri dari ${imageList.length} lembar nota yang merupakan bagian dari SATU transaksi faktur yang sama (misal Lembar 1, Lembar 2, Lembar 3).
- Gabungkan SELURUH item/barang dari setiap lembar foto secara berurutan ke dalam array 'items' tunggal.
- Jangan sampai ada item yang terlewat dari lembar manapun, dan jangan ada item yang terduplikasi.
- Header supplier dan nomor faktur biasanya ada di lembar pertama atau diulang di tiap lembar.
- Total belanja (totalAmount) adalah grand total akhir yang tertera pada lembar nota terakhir, atau total akumulasi seluruh baris item.`
    : ''
}

Perhatikan detail penting pada nota toko/grosir Indonesia:
1. Supplier: Nama toko/distributor pada kop/header nota (misal "TOKO FAJAR JAYA"), alamat jika ada, nomor telepon/HP jika ada.
2. Faktur/Nota: Nomor faktur/nota (contoh: JT 261108027, NO: 1234), tanggal transaksi (format YYYY-MM-DD), waktu jika ada.
3. Tipe Pembayaran: 'TEMPO' jika ada tulisan tempo, kredit, jatuh tempo, atau 'CASH' jika tunai/lunas. Jika tempo, perkirakan jumlah hari tempo (misal 7, 14, atau 30).
4. Catatan tambahan: Catatan khusus atau tulisan tangan di bawah nota (seperti promo, bonus barang, '+ 1 box gelas', 'titip', dll).
5. Daftar Item/Barang:
   Untuk setiap item baris di nota:
   - name: Nama produk yang bersih dan jelas (misal "Gula Pasir RMI", "Minyak Goreng Fortune Refill 800ml", "Tepung Terigu Cap Payung", "Royco Kaldu Ayam Renceng")
   - rawName: Teks asli yang tertulis di nota (misal "DELE BOLA", "ROYCO RTG AYAM", "FORTUNE REFIL 800ML")
   - quantity: Jumlah kuantitas beli dalam angka desimal/bulat (misal: 1, 3, 10)
   - unit: Nama satuan kemasan beli persis di nota (misal "SAK", "KRTN", "DUS", "BKS", "POUCH", "BTL", "RENCENG", "BAL", "KG")
   - unitPrice: Harga beli per satuan tersebut (angka murni tanpa titik pemisah ribuan)
   - subtotal: Total harga baris tersebut (quantity * unitPrice)
   - baseUnit: Satuan dasar terkecil produk (misal: SAK 50kg -> KG; KARTON isi pouch -> POUCH; KARTON isi botol -> BTL; RENCENG -> RENCENG; DUS -> DUS atau CUP)
   - conversionFactor: Perkiraan pengali dari satuan kemasan beli ke satuan dasar (misal: Sak Beras/Gula 50kg = 50; Sak Terigu 25kg = 25; Karton Minyak 1L/800ml = 12; Karton botol 200ml = 24; Dus air gelas = 48; Karton Royco = 40; dll)
   - categoryName: Salah satu kategori sembako yang paling cocok ("Beras & Biji-bijian", "Minyak Goreng & Margarin", "Gula & Pemanis", "Tepung & Olahan", "Mie Instan, Bihun & Pasta", "Kopi, Teh & Minuman Sachet", "Telur & Susu", "Bumbu Dapur & Penyedap", "Sabun & Kebersihan Rumah", "Minuman Kemasan & Air Mineral", atau "Lainnya")
6. totalAmount: Total keseluruhan belanja pada nota (harus sama persis dengan angka Grand Total pada nota).

Kembalikan HANYA format JSON valid tanpa tanda markdown (tanpa \`\`\`json atau \`\`\`) dengan struktur:
{
  "supplier": {
    "name": string,
    "phone": string | null,
    "address": string | null
  },
  "invoiceNumber": string | null,
  "date": string,
  "paymentType": "CASH" | "TEMPO",
  "dueDays": number | null,
  "notes": string | null,
  "items": [
    {
      "name": string,
      "rawName": string,
      "quantity": number,
      "unit": string,
      "unitPrice": number,
      "subtotal": number,
      "baseUnit": string,
      "conversionFactor": number,
      "categoryName": string
    }
  ],
  "totalAmount": number
}
`;

    // Map each image into a part in the contents
    const parts: any[] = imageList.map((img) => ({
      inline_data: {
        mime_type: img.mimeType,
        data: img.cleanBase64,
      },
    }));

    parts.push({
      text: prompt,
    });

    const requestBody = {
      contents: [
        {
          parts,
        },
      ],
      generationConfig: {
        response_mime_type: 'application/json',
        temperature: 0.1,
      },
    };

    let rawJsonText = '';

    // Try Gemini 2.0 Flash first, fallback to Gemini 1.5 Flash
    const models = ['gemini-2.0-flash', 'gemini-1.5-flash'];
    let lastError: any = null;

    for (const model of models) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          }
        );

        if (!response.ok) {
          const errData: any = await response.json().catch(() => ({}));
          const errMsg = errData.error?.message || `HTTP ${response.status}: ${response.statusText}`;
          throw new Error(errMsg);
        }

        const data: any = await response.json();
        const candidate = data.candidates?.[0];
        const text = candidate?.content?.parts?.[0]?.text;

        if (text) {
          rawJsonText = text;
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[AI Vision] Model ${model} gagal:`, err.message);
      }
    }

    if (!rawJsonText) {
      const error: any = new Error(
        lastError?.message || 'Gagal memproses gambar nota dengan Gemini Vision AI. Pastikan foto jelas dan API Key valid.'
      );
      error.statusCode = 502;
      throw error;
    }

    // Clean and parse JSON
    let parsed: any;
    try {
      const sanitized = rawJsonText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
      parsed = JSON.parse(sanitized);
    } catch (e: any) {
      console.error('[AI Vision] Gagal parse JSON hasil Gemini:', rawJsonText);
      const error: any = new Error('Respon AI tidak valid dalam format JSON: ' + e.message);
      error.statusCode = 502;
      throw error;
    }

    // 4. Enrich parsed data against existing Database (Products, Suppliers, Categories)
    const existingProducts = await prisma.product.findMany({
      include: { units: true, category: true },
    });

    const existingSuppliers = await prisma.supplier.findMany();
    const categories = await prisma.category.findMany();

    const normalize = (str: string) =>
      str.toLowerCase().replace(/[^a-z0-9]/g, '').trim();

    // Match Supplier
    let matchedSupplier = null;
    if (parsed.supplier?.name) {
      const normSupp = normalize(parsed.supplier.name);
      matchedSupplier = existingSuppliers.find(
        (s) =>
          normalize(s.name).includes(normSupp) ||
          normSupp.includes(normalize(s.name))
      );
    }

    const supplierResult = {
      id: matchedSupplier?.id || null,
      name: matchedSupplier?.name || parsed.supplier?.name || 'Supplier Tanpa Nama',
      phone: matchedSupplier?.phone || parsed.supplier?.phone || null,
      address: matchedSupplier?.address || parsed.supplier?.address || null,
      isExisting: !!matchedSupplier,
    };

    // Match Category Map
    const catMap: Record<string, number> = {};
    for (const c of categories) {
      catMap[normalize(c.name)] = c.id;
    }

    // Match Products
    const itemsResult: ExtractedReceiptItem[] = (parsed.items || []).map((item: any) => {
      const normItemName = normalize(item.name || item.rawName || '');
      const normRaw = normalize(item.rawName || '');

      const matchedProd = existingProducts.find((p) => {
        const normP = normalize(p.name);
        return (
          normP === normItemName ||
          normP === normRaw ||
          normP.includes(normItemName) ||
          (normItemName.length > 5 && normItemName.includes(normP))
        );
      });

      // Match category
      let categoryId: number | null = null;
      if (item.categoryName) {
        const normCat = normalize(item.categoryName);
        for (const [cName, cId] of Object.entries(catMap)) {
          if (cName.includes(normCat) || normCat.includes(cName)) {
            categoryId = cId;
            break;
          }
        }
      }
      if (!categoryId && matchedProd) {
        categoryId = matchedProd.categoryId;
      }
      if (!categoryId && categories.length > 0) {
        categoryId = categories[0].id;
      }

      const factor = Number(item.conversionFactor) || 1;
      const baseCost = item.unitPrice ? Math.round(Number(item.unitPrice) / factor) : 0;
      // Suggested selling price: ~10% margin for grocery
      const suggestedSellingPrice = Math.round((baseCost * 1.1) / 100) * 100;
      const suggestedWholesalePrice = Math.round((baseCost * 1.05) / 100) * 100;

      return {
        name: matchedProd?.name || item.name || 'Produk Baru',
        rawName: item.rawName || item.name || '',
        quantity: Number(item.quantity) || 1,
        unit: (item.unit || 'PCS').toUpperCase(),
        unitPrice: Number(item.unitPrice) || 0,
        subtotal: Number(item.subtotal) || (Number(item.quantity) || 1) * (Number(item.unitPrice) || 0),
        baseUnit: (matchedProd?.baseUnit || item.baseUnit || 'PCS').toUpperCase(),
        conversionFactor: factor,
        categoryName: item.categoryName || matchedProd?.category?.name || 'Umum',
        categoryId: categoryId,
        matchedProductId: matchedProd?.id || null,
        matchedProductSku: matchedProd?.sku || null,
        isExistingProduct: !!matchedProd,
        suggestedSellingPrice,
        suggestedWholesalePrice,
      };
    });

    return {
      supplier: supplierResult,
      invoiceNumber: parsed.invoiceNumber || null,
      date: parsed.date || new Date().toISOString().slice(0, 10),
      paymentType: parsed.paymentType === 'TEMPO' ? 'TEMPO' : 'CASH',
      dueDays: parsed.dueDays || (parsed.paymentType === 'TEMPO' ? 7 : null),
      notes: parsed.notes || null,
      items: itemsResult,
      totalAmount: Number(parsed.totalAmount) || itemsResult.reduce((sum, it) => sum + it.subtotal, 0),
    };
  }
}

