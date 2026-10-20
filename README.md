# GrosirPOS — Point of Sale & Inventori Grosir Sembako

GrosirPOS adalah sistem Point of Sale (POS), manajemen inventori, dan operasional toko grosir sembako di Indonesia. Dibangun dengan arsitektur monorepo berstandar enterprise, performa tinggi, dan akurasi transaksi tanpa floating-point imprecision.

---

## 1. Tech Stack

- **Frontend (`apps/web`)**:
  - React 18, Vite, TypeScript
  - Styling: Tailwind CSS (Primary `#176B58`, Background `#F5F7F6`, Text `#17212B`)
  - State Management: Zustand (Auth) & TanStack Query (Server Caching)
  - Routing: React Router v6
  - Forms & Validation: React Hook Form + Zod
  - Icons: Lucide React
  - Testing: Vitest

- **Backend (`apps/api`)**:
  - Node.js, Express.js, TypeScript
  - Database: MySQL
  - ORM: Prisma ORM
  - Auth: JWT with HTTP-only Cookies & Bearer Tokens, Bcrypt hashing
  - Validation: Zod middleware
  - POS Engine: Transaksi ACID, pencegahan pengurangan stok ganda, kalkulasi Decimal presisi, audit trail otomatis
  - Testing: Vitest & Supertest

---

## 2. Fitur Utama & Modul (Tahap 1 & Tahap 2)

### A. Fitur Scan Barcode Cepat (Barcode Scanning)
- **Dukungan Hardware Scanner (USB/Bluetooth)**: Input barcode selalu autofocus, menerima input keyboard barcode scanner (Enter key) secara instan.
- **Scan Barcode Kamera (Webcam / Tablet)**: Terintegrasi dengan kamera perangkat menggunakan `html5-qrcode` yang mendukung format retail EAN-13, Code-128, UPC, dan QR Code.
- **Deteksi Satuan Kemasan Otomatis**: Jika barcode yang di-scan adalah barcode dus/karton (`product_units.barcode`), sistem langsung menambahkan item ke keranjang sebagai satuan **DUS**, bukan eceran.
- **Audio Feedback Nyata**: Dilengkapi audio synthesizer Web Audio API (bunyi bip frekuensi tinggi saat scan berhasil, buzz nada rendah saat gagal, dan denting lonceng saat pembayaran tuntas).

### B. Mesin Kasir POS (Point of Sale)
- **Multi-Satuan Real-time di Keranjang**: Kasir dapat mengubah satuan langsung pada keranjang (misal dari PCS ke DUS atau RENCENG). Harga dan ketersediaan stok fisik terhitung otomatis.
- **Dukungan Pelanggan Eceran vs Grosir**: Beralih mode pelanggan umum ke langganan grosir langsung mengaktifkan harga partai/grosir secara otomatis.
- **Transaksi ACID Tanpa Pengurangan Ganda**: Checkout memproses pemotongan stok pada satuan dasar (`baseUnit`), snapshot harga/satuan transaksi, dan pencatatan audit trail `StockMovement` bertipe `OUT`.
- **Cetak Struk Kasir (Thermal Receipt)**: Format struk kasir standar toko sembako 58mm / 80mm dengan detail faktur, kasir, rincian barang, dan kembalian uang.

### C. Riwayat Penjualan & Laporan
- Riwayat seluruh faktur penjualan (`INV-YYYYMMDD-XXXX`), ringkasan total omset dan jumlah transaksi, filter rentang tanggal dan metode bayar, serta cetak ulang struk nota.

### D. Modul Supplier & Pembelian Kulakan (Tahap 3)
- **Master Data Supplier & Rekanan**: Pencatatan data distributor grosir (`SUPP-XXXX`), kontak sales person, nomor telepon, alamat gudang, serta tracking total transaksi pembelian.
- **Penerimaan Barang Masuk (Restock / Kulakan)**: Pencatatan faktur masuk (`PB-YYYYMMDD-XXXX`) dengan referensi nomor surat jalan fisik distributor, tanggal masuk, dan konversi multi-kemasan (misal beli 10 DUS otomatis menambah 400 BKS ke stok fisik).
- **Update Otomatis HPP (Harga Pokok Penjualan)**: Opsi otomatis untuk memperbarui HPP produk di katalog barang sesuai harga beli satuan terbaru saat kulakan.
- **Audit Trail Mutasi Stok Otomatis**: Setiap transaksi pembelian mencatat `StockMovement` bertipe `IN` dengan referensi nomor faktur pembelian secara ACID transaction.
- **Manajemen Hutang Dagang (Tempo)**: Dukungan sistem bayar Tunai (CASH) atau Tempo (Hutang Bon), penetapan tanggal jatuh tempo, pencatatan uang muka (DP), riwayat cicilan pelunasan hutang, dan dashboard peringatan tempo jatuh tempo (≤ 7 hari).

---

## 2. Struktur Monorepo

```
Kasir-Pos-ZGroup/
├── apps/
│   ├── api/                          # Backend Express + Prisma
│   │   ├── prisma/
│   │   │   ├── schema.prisma         # Skema database MySQL
│   │   │   ├── seed.ts               # Data demo realistis sembako
│   │   │   └── migrations/           # Riwayat migrasi Prisma
│   │   ├── src/
│   │   │   ├── config/               # Prisma client & env loader
│   │   │   ├── controllers/          # Auth, Product, Category, Dashboard
│   │   │   ├── middlewares/          # Auth, RBAC, Validate, ErrorHandler
│   │   │   ├── routes/               # Express REST API routes
│   │   │   ├── services/             # Domain & business logic
│   │   │   ├── utils/                # JWT, Bcrypt, Response formatters
│   │   │   ├── validations/          # Zod request validation schemas
│   │   │   ├── app.ts                # Express app configuration
│   │   │   └── server.ts             # Entrypoint server
│   │   └── tests/
│   │       └── api.test.ts           # Vitest + Supertest integration tests
│   │
│   └── web/                          # Frontend React + Vite
│       ├── src/
│       │   ├── components/
│       │   │   ├── layout/           # AppLayout, Sidebar, Header (Desktop + Tablet)
│       │   │   ├── products/         # ProductFormModal, StockAdjustModal, StockHistoryModal
│       │   │   └── ui/               # Button, Input, Select, Badge, Card, Modal, Toast
│       │   ├── lib/                  # Axios instance, currency & number formatters
│       │   ├── pages/                # LoginPage, DashboardPage, ProductsPage, PlaceholderPage
│       │   ├── routes/               # AppRoutes, ProtectedRoute (RBAC)
│       │   ├── stores/               # Zustand auth store
│       │   ├── types/                # TypeScript interfaces
│       │   ├── App.tsx
│       │   ├── main.tsx
│       │   └── index.css
│       └── tests/
│           └── utils.test.ts
├── package.json
└── README.md
```

---

## 3. Skema Database & Relasi

1. **`users`**:
   - `id` (PK, Int Auto-increment)
   - `name`, `email` (Unique), `password` (Hashed Bcrypt), `phone`
   - `role`: Enum (`OWNER`, `ADMIN`, `CASHIER`, `WAREHOUSE`)
   - `isActive`: Boolean

2. **`categories`**:
   - `id` (PK), `code` (Unique, e.g. `CAT-BRS`), `name`, `description`, `isActive`
   - Relasi: 1-to-Many dengan `products`

3. **`products`**:
   - `id` (PK), `sku` (Unique), `barcode` (Unique/Indexed), `name`, `description`
   - `categoryId` (FK ke `categories`)
   - `baseUnit`: Satuan dasar terkecil (e.g. `KG`, `PCS`, `POUCH`, `BKS`)
   - `currentStock`: `Decimal(12, 2)` (Dicatat selalu dalam satuan dasar)
   - `minStock`: `Decimal(12, 2)` (Ambang batas peringatan stok menipis)
   - `purchasePrice`: `Decimal(15, 2)` (HPP per satuan dasar)
   - `isActive`: Boolean

4. **`product_units`** (Multi-satuan / Multi-tier Unit):
   - `id` (PK), `productId` (FK ke `products`)
   - `unitName`: e.g. `PCS`, `DUS`, `PACK`, `SAK 25KG`, `RENCENG`
   - `conversionFactor`: `Decimal(10, 2)` (Pengali ke satuan dasar, misal 1 DUS = 24 PCS -> faktor 24)
   - `isBaseUnit`: Boolean (Unit dasar memiliki faktor 1)
   - `price`: `Decimal(15, 2)` (Harga jual standar/eceran)
   - `wholesalePrice`: `Decimal(15, 2)` (Harga jual grosir/partai)
   - `barcode`: Barcode khusus kemasan satuan ini
   - Constraint: `Unique(productId, unitName)`

5. **`stock_movements`** (Audit Trail Mutasi Stok):
   - `id` (PK), `productId` (FK)
   - `type`: Enum (`IN`, `OUT`, `ADJUSTMENT`, `RETURN`)
   - `quantity`: Jumlah perubahan dalam satuan dasar
   - `previousStock`, `currentStock`: Nilai sebelum dan sesudah perubahan
   - `referenceType`: e.g. `INITIAL`, `PURCHASE`, `SALE`, `MANUAL_ADJUSTMENT`
   - `note`: Alasan/keterangan mutasi audit
   - `userId`: Petugas pencatat mutasi
   - `createdAt`: Timestamp

---

## 4. Akun Demo Bawaan (Seed Data)

Semua akun menggunakan password: `password123`

| Role | Nama | Email | Hak Akses |
|---|---|---|---|
| **OWNER** | Budi Santoso (Owner) | `owner@grosirpos.com` | Seluruh fitur, produk, dan laporan |
### E. Modul Pelanggan & Piutang Bon Tempo (Tahap 4)
- **Master Data Pelanggan**: Registrasi pelanggan toko (`CUST-XXXX`), tier klasifikasi (Retail, Semi-Grosir, Grosir Besar), batas plafon kredit (`creditLimit`), status aktif, dan nomor kontak/alamat.
- **Sistem Piutang & Transaksi Bon (Tempo)**: Kasir dapat memproses checkout sistem tempo dengan tanggal jatuh tempo (`dueDate`). Sistem memvalidasi apakah sisa plafon kredit pelanggan mencukupi sebelum transaksi disetujui.
- **Pencatatan Cicilan Pelunasan Bon (`OrderPayment`)**: Kartu piutang per pelanggan, pelunasan sebagian (cicilan) atau lunas sekaligus dengan update status otomatis (`PENDING`, `PARTIAL`, `PAID`).
- **Master Kategori Produk Sembako**: CRUD kategori barang (`/categories`) dengan ikon, deskripsi, dan tracking jumlah produk aktif.

### F. Manajemen Staf & Sentralisasi Stock Opname (Tahap 5)
- **Manajemen Akun Staf & RBAC (`/users`)**: Khusus pemilik toko (`OWNER`) untuk menambah, mengedit, menonaktifkan akun staf (Owner, Admin, Kasir, Gudang), mereset kata sandi staf, serta proteksi keamanan anti-hapus pada akun Owner terakhir.
- **Sentralisasi Audit Trail Mutasi Inventori (`/inventory`)**: Pencatatan riwayat kartu stok secara menyeluruh dari seluruh transaksi (`IN`, `OUT`, `SALE`, `PURCHASE`, `ADJUSTMENT`, `OPNAME`) dengan filter jenis dan rentang waktu.
- **Lembar Hitung Fisik Stock Opname (Live Opname Sheet)**: Tab opname fisik langsung di mana petugas gudang menginput jumlah hitungan fisik di toko, sistem menghitung selisih (surplus/defisit) secara otomatis, dan tombol "Simpan & Terapkan Opname" langsung mengupdate stok dan mencatat referensi mutasi opname.

### G. Laporan Finansial, Arus Kas & Ekspor CSV (Tahap 6)
- **Laporan Laba Rugi (P&L / Profit & Loss)**: Perhitungan Omzet Penjualan Kotor, Diskon, Pajak, Total Beban Pokok Penjualan (HPP / COGS), Laba Kotor (Gross Profit), serta Gross Margin (%).
- **Laporan Arus Kas Nyata (Cashflow Statement)**: Pemantauan kas masuk riil (penjualan lunas + pelunasan piutang bon), kas keluar riil (pembelian tunai supplier + pelunasan hutang kulakan), dan posisi arus kas bersih (surplus/defisit).
- **Peringkat 10 Produk Grosir Terlaris**: Pemantauan produk dengan perputaran tercepat (Fast Moving) berdasarkan kuantitas, kontribusi omzet, HPP, laba kotor, dan margin.
- **Pusat Ekspor Pembukuan CSV**: Ekspor 1-klik untuk Data Penjualan (`sales.csv`), Data Pembelian (`purchases.csv`), dan Data Saldo & Valuasi Inventaris (`inventory.csv`) yang kompatibel dengan Microsoft Excel dan software akuntansi.

### H. Shift Kasir & Transaksi Gantung (Tahap 7)
- **Buka & Tutup Shift Kasir (`CashShift`)**: Setiap kasir wajib membuka shift dengan saldo modal awal kas laci (`startingCash`).
- **Live Cash Drawer Reconciliation**: Sistem menghitung total penjualan tunai riil per shift, membandingkan kas fisik aktual (`closingCash`) vs ekspektasi sistem (`expectedCash`), dan mencatat selisih lebih/kurang (`difference`).
- **Cetak Laporan Z-Report Kasir**: Format struk penutupan shift kasir dengan ringkasan transaksi tunai, non-tunai, modal awal, dan rekonsiliasi kas.
- **Transaksi Gantung (Hold & Recall Cart)**: Kasir dapat menahan keranjang sementara saat pelanggan mengambil barang tambahan atau uang tertinggal, melayani pelanggan berikutnya, dan memuat kembali (`recall`) keranjang yang tertahan secara instan.

### I. Modul Retur Penjualan & Pembelian (Tahap 8)
- **Retur Penjualan Konsumen (`/returns` - Penjualan)**: Pencatatan pengembalian barang dari pembeli berdasarkan nomor faktur (`INV-...`), opsi pengembalian unit ke stok toko atau dicatat rusak, serta opsi pengembalian dana (Tunai, Potong Piutang Bon, atau Tanpa Refund).
- **Retur Pembelian Supplier (`/returns` - Pembelian)**: Pengembalian barang cacat/rusak/expired ke distributor berdasarkan faktur pembelian (`PB-...`), otomatis memotong stok fisik gudang dan memotong saldo hutang tempo supplier secara akurat.
- **Audit Trail & ACID Transaction**: Seluruh proses retur mencatat `StockMovement` bertipe `RETURN` secara atomik.

### J. Cetak Barcode & Price Tag Rak Toko (Tahap 9)
- **Label Stiker Barcode Repack Sembako (`/barcode-print`)**: Pembuatan dan cetak label barcode stiker untuk produk sembako hasil repack/timbang sendiri (gula pasir curah, beras kiloan, minyak kemasan kecil).
- **Price Tag Rak Toko (Shelf Talkers)**: Format cetak label rak yang menampilkan Nama Produk, SKU/Barcode, Satuan Dasar, Harga Eceran, dan Harga Grosir/Partai berdampingan untuk transparansi konsumen.

### K. Pengaturan Toko & Konfigurasi Thermal Printer (Tahap 10)
- **Profil & Identitas Toko (`/settings`)**: Konfigurasi Nama Toko, Tagline/Slogan, Alamat Lengkap, Nomor Kontak WhatsApp/Telepon Toko, dan Pesan Penutup Kaki Struk (Receipt Footer).
- **Format Printer Thermal 58mm & 80mm**: Pengaturan ukuran kertas printer thermal yang otomatis menyesuaikan layout tampilan dan cetak struk POS serta struk laporan penutupan shift (Z-Report).

---

## 3. Akun Pengguna Bawaan (Demo)

| Peran (Role) | Nama | Email Login | Hak Akses Utama |
|---|---|---|---|
| **OWNER** | Budi Santoso (Owner) | `owner@grosirpos.com` | Akses penuh: Finansial, Pengguna, POS, Stok, Supplier, Customer |
| **ADMIN** | Siti Rahma (Admin) | `admin@grosirpos.com` | Produk, stok, kategori, customer, laporan, operasional |
| **CASHIER** | Andi Wijaya (Kasir) | `kasir@grosirpos.com` | Penjualan POS, cetak struk, katalog produk & bon customer |
| **WAREHOUSE** | Rudi Hermawan (Gudang) | `gudang@grosirpos.com` | Barang masuk, penerimaan PO, stock opname & mutasi |

*Password untuk semua akun demo:* `password123`

---

## 4. Perintah Menjalankan Aplikasi

### Instalasi & Setup Database
```bash
# 1. Install seluruh dependencies
npm install

# 2. Generate Prisma Client
npm run prisma:generate

# 3. Jalankan migrasi database MySQL
npm run prisma:migrate

# 4. Jalankan Seeding data demo sembako
npm run prisma:seed
```

### Menjalankan Server Development
```bash
# Jalankan Backend API (Port 5001)
npm run dev:api

# Jalankan Frontend Web (Port 5174)
npm run dev:web
```

Akses di browser:
- **Frontend App**: [http://localhost:5174](http://localhost:5174)
- **Backend API**: [http://localhost:5001/api/health](http://localhost:5001/api/health)

---

## 5. Menjalankan Pengujian Otomatis (Testing)

```bash
# Jalankan pengujian backend API (48 Tests: Auth, RBAC, POS ACID, Supplier Restock, Customer Receivables, Users, Stock Opname, Financial Reports, Shift Kasir, Retur Barang, Store Settings)
npm run test --workspace=apps/api

# Jalankan pengujian frontend (9 Tests: Formatter Rupiah, Angka, POS Calculations, Multi-unit Restock, Tempo Debt)
npm run test --workspace=apps/web
```

