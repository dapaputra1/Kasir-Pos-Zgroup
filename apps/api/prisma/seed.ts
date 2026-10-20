import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Memulai pembersihan data dummy dan inisialisasi katalog grosir sembako...');

  // 1. Bersihkan transaksi lama dan data dummy (anak tabel terlebih dahulu)
  console.log('🧹 Membersihkan transaksi lama, riwayat retur, shift kasir, dan audit stok...');
  await prisma.saleReturnItem.deleteMany({});
  await prisma.saleReturn.deleteMany({});
  await prisma.orderPayment.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});

  await prisma.purchaseReturnItem.deleteMany({});
  await prisma.purchaseReturn.deleteMany({});
  await prisma.purchasePayment.deleteMany({});
  await prisma.purchaseItem.deleteMany({});
  await prisma.purchase.deleteMany({});

  await prisma.cashShift.deleteMany({});
  await prisma.stockMovement.deleteMany({});
  await prisma.productUnit.deleteMany({});
  await prisma.product.deleteMany({});

  // Hapus data customer uji coba test
  await prisma.customer.deleteMany({
    where: {
      OR: [
        { code: { startsWith: 'CUST-TEST' } },
        { name: { contains: 'Test' } },
      ],
    },
  });

  // Hapus data supplier uji coba test
  await prisma.supplier.deleteMany({
    where: {
      OR: [
        { code: { startsWith: 'SUPP-TEST' } },
        { name: { contains: 'Test' } },
      ],
    },
  });

  // Hapus user staff test (tetap simpan owner utama & akun official)
  await prisma.user.deleteMany({
    where: {
      email: { startsWith: 'staff_' },
    },
  });

  console.log('✓ Pembersihan selesai.');

  // 2. Akun Pengguna Bawaan (Users)
  const passwordHash = await bcrypt.hash('password123', 10);

  const usersData = [
    {
      name: 'Budi Santoso (Owner)',
      email: 'owner@grosirpos.com',
      password: passwordHash,
      phone: '081234567890',
      role: Role.OWNER,
    },
    {
      name: 'Siti Rahma (Admin)',
      email: 'admin@grosirpos.com',
      password: passwordHash,
      phone: '081234567891',
      role: Role.ADMIN,
    },
    {
      name: 'Andi Wijaya (Kasir)',
      email: 'kasir@grosirpos.com',
      password: passwordHash,
      phone: '081234567892',
      role: Role.CASHIER,
    },
    {
      name: 'Rudi Hermawan (Gudang)',
      email: 'gudang@grosirpos.com',
      password: passwordHash,
      phone: '081234567893',
      role: Role.WAREHOUSE,
    },
  ];

  const createdUsers: Record<string, any> = {};

  for (const u of usersData) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        role: u.role,
        phone: u.phone,
      },
      create: u,
    });
    createdUsers[u.role] = user;
  }
  console.log(`✓ Master user dipastikan siap.`);

  // 3. Kategori Produk Sembako
  const categoriesData = [
    { code: 'CAT-BRS', name: 'Beras & Biji-bijian', description: 'Aneka beras premium, medium, ketan, dan kacang-kacangan' },
    { code: 'CAT-GLA', name: 'Gula & Pemanis', description: 'Gula pasir putih, kuning, gula merah, dan pemanis alami' },
    { code: 'CAT-MYK', name: 'Minyak Goreng & Margarin', description: 'Minyak kelapa sawit botol, pouch, jerigen, dan margarin' },
    { code: 'CAT-TPG', name: 'Tepung & Olahan', description: 'Tepung terigu, beras, tapioka, dan maizena' },
    { code: 'CAT-MIE', name: 'Mie Instan, Bihun & Pasta', description: 'Aneka merk mie instan dus dan eceran' },
    { code: 'CAT-TLR', name: 'Telur & Susu', description: 'Telur ayam ras negeri, susu kental manis, susu bubuk' },
    { code: 'CAT-KOP', name: 'Kopi, Teh & Minuman Sachet', description: 'Kopi sachet renceng, teh celup, sirup' },
    { code: 'CAT-BMB', name: 'Bumbu Dapur & Penyedap', description: 'Garam, penyedap rasa, kecap, saus' },
    { code: 'CAT-SBN', name: 'Sabun & Kebersihan Rumah', description: 'Deterjen, sabun cuci piring, pembersih lantai, pewangi' },
    { code: 'CAT-BTH', name: 'Perawatan Diri & Mandi', description: 'Sabun mandi, shampoo, pasta gigi, sikat gigi' },
    { code: 'CAT-MNM', name: 'Minuman Kemasan & Air Mineral', description: 'Air mineral galon, botol, cup, teh kemasan' },
    { code: 'CAT-PLT', name: 'Plastik & Perlengkapan Toko', description: 'Kantong kresek, tali rafia, karet gelang, kertas bungkus' },
  ];

  const createdCategories: Record<string, number> = {};

  for (const cat of categoriesData) {
    const category = await prisma.category.upsert({
      where: { code: cat.code },
      update: { name: cat.name, description: cat.description },
      create: cat,
    });
    createdCategories[cat.code] = category.id;
  }
  console.log(`✓ Master ${categoriesData.length} kategori grosir siap.`);

  // 4. Data Master Barang Grosir Sembako Nyata Indonesia
  const wholesaleProducts = [
    // --- 1. BERAS & BIJI-BIJIAN ---
    {
      sku: 'BRG-BRS-001',
      barcode: '8991234000101',
      name: 'Beras Ramos Setra Rojo Lele Super',
      categoryId: createdCategories['CAT-BRS'],
      baseUnit: 'KG',
      currentStock: 1000, // 20 Sak @ 50kg
      minStock: 150,
      purchasePrice: 13000,
      description: 'Beras pulen kualitas premium tanpa pewangi dan pemutih kimia',
      units: [
        { unitName: 'KG', conversionFactor: 1, isBaseUnit: true, price: 14500, wholesalePrice: 14000, barcode: '8991234000101' },
        { unitName: 'SAK 5KG', conversionFactor: 5, isBaseUnit: false, price: 72000, wholesalePrice: 70000, barcode: '8991234000102' },
        { unitName: 'SAK 25KG', conversionFactor: 25, isBaseUnit: false, price: 350000, wholesalePrice: 340000, barcode: '8991234000103' },
        { unitName: 'SAK 50KG', conversionFactor: 50, isBaseUnit: false, price: 695000, wholesalePrice: 680000, barcode: '8991234000104' },
      ],
    },
    {
      sku: 'BRG-BRS-002',
      barcode: '8991234000201',
      name: 'Beras Pandan Wangi Cianjur Asli',
      categoryId: createdCategories['CAT-BRS'],
      baseUnit: 'KG',
      currentStock: 500,
      minStock: 100,
      purchasePrice: 15500,
      description: 'Beras aromatik khas Cianjur bulir bulat pulen wangi alami',
      units: [
        { unitName: 'KG', conversionFactor: 1, isBaseUnit: true, price: 17500, wholesalePrice: 16800, barcode: '8991234000201' },
        { unitName: 'SAK 5KG', conversionFactor: 5, isBaseUnit: false, price: 86000, wholesalePrice: 83000, barcode: '8991234000202' },
        { unitName: 'SAK 25KG', conversionFactor: 25, isBaseUnit: false, price: 425000, wholesalePrice: 410000, barcode: '8991234000203' },
      ],
    },
    {
      sku: 'BRG-BRS-003',
      barcode: '8991234000301',
      name: 'Kacang Hijau Kupas Super',
      categoryId: createdCategories['CAT-BRS'],
      baseUnit: 'KG',
      currentStock: 150,
      minStock: 30,
      purchasePrice: 22000,
      description: 'Kacang hijau pilihan bersih cocok untuk bubur dan isian onde-onde',
      units: [
        { unitName: 'KG', conversionFactor: 1, isBaseUnit: true, price: 26000, wholesalePrice: 24500, barcode: '8991234000301' },
        { unitName: 'KARUNG 25KG', conversionFactor: 25, isBaseUnit: false, price: 615000, wholesalePrice: 600000, barcode: '8991234000302' },
      ],
    },

    // --- 2. GULA & PEMANIS ---
    {
      sku: 'BRG-GLA-001',
      barcode: '8993456000303',
      name: 'Gula Pasir Gulaku Kuning Premium',
      categoryId: createdCategories['CAT-GLA'],
      baseUnit: 'KG',
      currentStock: 1000, // 20 karung @ 50kg
      minStock: 200,
      purchasePrice: 15800,
      description: 'Gula tebu murni butiran kuning alami rasa manis legit',
      units: [
        { unitName: 'KG', conversionFactor: 1, isBaseUnit: true, price: 17500, wholesalePrice: 17000, barcode: '8993456000303' },
        { unitName: 'KARUNG 50KG', conversionFactor: 50, isBaseUnit: false, price: 840000, wholesalePrice: 825000, barcode: '8993456000304' },
      ],
    },
    {
      sku: 'BRG-GLA-002',
      barcode: '8993456000310',
      name: 'Gula Pasir GMP Putih Kristal',
      categoryId: createdCategories['CAT-GLA'],
      baseUnit: 'KG',
      currentStock: 750, // 15 karung @ 50kg
      minStock: 150,
      purchasePrice: 15500,
      description: 'Gula kristal putih GMP bersih untuk aneka kue dan minuman',
      units: [
        { unitName: 'KG', conversionFactor: 1, isBaseUnit: true, price: 17200, wholesalePrice: 16700, barcode: '8993456000310' },
        { unitName: 'KARUNG 50KG', conversionFactor: 50, isBaseUnit: false, price: 830000, wholesalePrice: 815000, barcode: '8993456000311' },
      ],
    },
    {
      sku: 'BRG-GLA-003',
      barcode: '8993456000320',
      name: 'Gula Merah / Kelapa Super Cilacap',
      categoryId: createdCategories['CAT-GLA'],
      baseUnit: 'KG',
      currentStock: 200,
      minStock: 40,
      purchasePrice: 18000,
      description: 'Gula kelapa cetak batok murni wangi gurih',
      units: [
        { unitName: 'KG', conversionFactor: 1, isBaseUnit: true, price: 21000, wholesalePrice: 20000, barcode: '8993456000320' },
        { unitName: 'BAL 10KG', conversionFactor: 10, isBaseUnit: false, price: 200000, wholesalePrice: 195000, barcode: '8993456000321' },
      ],
    },

    // --- 3. MINYAK GORENG & MARGARIN ---
    {
      sku: 'BRG-MYK-001',
      barcode: '8992345000202',
      name: 'Minyak Goreng Bimoli Klasik Pouch 1L',
      categoryId: createdCategories['CAT-MYK'],
      baseUnit: 'POUCH',
      currentStock: 360, // 30 dus @ 12 pouch
      minStock: 48,
      purchasePrice: 17500,
      description: 'Minyak kelapa sawit murni kualitas istimewa jernih tahan panas',
      units: [
        { unitName: 'POUCH', conversionFactor: 1, isBaseUnit: true, price: 19500, wholesalePrice: 18500, barcode: '8992345000202' },
        { unitName: 'DUS (12 POUCH)', conversionFactor: 12, isBaseUnit: false, price: 225000, wholesalePrice: 220000, barcode: '8992345000203' },
      ],
    },
    {
      sku: 'BRG-MYK-002',
      barcode: '8992345000210',
      name: 'Minyak Goreng Bimoli Klasik Pouch 2L',
      categoryId: createdCategories['CAT-MYK'],
      baseUnit: 'POUCH',
      currentStock: 180, // 30 dus @ 6 pouch
      minStock: 30,
      purchasePrice: 34000,
      description: 'Minyak goreng Bimoli 2 Liter kemasan pouch hemat',
      units: [
        { unitName: 'POUCH', conversionFactor: 1, isBaseUnit: true, price: 37500, wholesalePrice: 36000, barcode: '8992345000210' },
        { unitName: 'DUS (6 POUCH)', conversionFactor: 6, isBaseUnit: false, price: 220000, wholesalePrice: 215000, barcode: '8992345000211' },
      ],
    },
    {
      sku: 'BRG-MYK-003',
      barcode: '8992345000220',
      name: 'Minyak Goreng Minyakita Pouch 1L',
      categoryId: createdCategories['CAT-MYK'],
      baseUnit: 'POUCH',
      currentStock: 600, // 50 dus @ 12 pouch
      minStock: 60,
      purchasePrice: 14500,
      description: 'Minyak goreng subsidi pemerintah harga terjangkau kualitas baik',
      units: [
        { unitName: 'POUCH', conversionFactor: 1, isBaseUnit: true, price: 16000, wholesalePrice: 15300, barcode: '8992345000220' },
        { unitName: 'DUS (12 POUCH)', conversionFactor: 12, isBaseUnit: false, price: 188000, wholesalePrice: 182000, barcode: '8992345000221' },
      ],
    },
    {
      sku: 'BRG-MYK-004',
      barcode: '8992345000230',
      name: 'Margarin Blue Band Serbaguna 200g',
      categoryId: createdCategories['CAT-MYK'],
      baseUnit: 'SCH',
      currentStock: 300, // 5 dus @ 60 sch
      minStock: 60,
      purchasePrice: 8500,
      description: 'Margarin serbaguna kaya vitamin cocok untuk olesan dan memasak',
      units: [
        { unitName: 'SCH', conversionFactor: 1, isBaseUnit: true, price: 10500, wholesalePrice: 9800, barcode: '8992345000230' },
        { unitName: 'DUS (60 SCH)', conversionFactor: 60, isBaseUnit: false, price: 540000, wholesalePrice: 525000, barcode: '8992345000231' },
      ],
    },

    // --- 4. TEPUNG & OLAHAN ---
    {
      sku: 'BRG-TPG-001',
      barcode: '8995678000505',
      name: 'Tepung Terigu Segitiga Biru 1kg',
      categoryId: createdCategories['CAT-TPG'],
      baseUnit: 'BKS',
      currentStock: 480, // 40 dus @ 12 bks
      minStock: 48,
      purchasePrice: 11200,
      description: 'Tepung terigu serbaguna protein sedang untuk segala olahan',
      units: [
        { unitName: 'BKS', conversionFactor: 1, isBaseUnit: true, price: 13000, wholesalePrice: 12500, barcode: '8995678000505' },
        { unitName: 'DUS (12 BKS)', conversionFactor: 12, isBaseUnit: false, price: 148000, wholesalePrice: 144000, barcode: '8995678000506' },
        { unitName: 'SAK 25KG', conversionFactor: 25, isBaseUnit: false, price: 295000, wholesalePrice: 285000, barcode: '8995678000507' },
      ],
    },
    {
      sku: 'BRG-TPG-002',
      barcode: '8995678000510',
      name: 'Tepung Beras Rose Brand 500g',
      categoryId: createdCategories['CAT-TPG'],
      baseUnit: 'BKS',
      currentStock: 400, // 20 dus @ 20 bks
      minStock: 40,
      purchasePrice: 6800,
      description: 'Tepung beras putih murni halus untuk kue tradisional',
      units: [
        { unitName: 'BKS', conversionFactor: 1, isBaseUnit: true, price: 8000, wholesalePrice: 7500, barcode: '8995678000510' },
        { unitName: 'DUS (20 BKS)', conversionFactor: 20, isBaseUnit: false, price: 155000, wholesalePrice: 148000, barcode: '8995678000511' },
      ],
    },
    {
      sku: 'BRG-TPG-003',
      barcode: '8995678000520',
      name: 'Tepung Tapioka / Aci Gunung Agung 500g',
      categoryId: createdCategories['CAT-TPG'],
      baseUnit: 'BKS',
      currentStock: 300, // 15 dus @ 20 bks
      minStock: 40,
      purchasePrice: 5800,
      description: 'Tepung tapioka berkualitas kenyal pas untuk bakso dan cilok',
      units: [
        { unitName: 'BKS', conversionFactor: 1, isBaseUnit: true, price: 7200, wholesalePrice: 6700, barcode: '8995678000520' },
        { unitName: 'DUS (20 BKS)', conversionFactor: 20, isBaseUnit: false, price: 135000, wholesalePrice: 130000, barcode: '8995678000521' },
      ],
    },

    // --- 5. MIE INSTAN, BIHUN & PASTA ---
    {
      sku: 'BRG-MIE-001',
      barcode: '8994567000404',
      name: 'Indomie Goreng Spesial 85g',
      categoryId: createdCategories['CAT-MIE'],
      baseUnit: 'BKS',
      currentStock: 1600, // 40 dus @ 40 bks
      minStock: 160,
      purchasePrice: 2750,
      description: 'Mie goreng instan nomor satu di Indonesia rasa lezat otentik',
      units: [
        { unitName: 'BKS', conversionFactor: 1, isBaseUnit: true, price: 3200, wholesalePrice: 3000, barcode: '8994567000404' },
        { unitName: 'DUS (40 BKS)', conversionFactor: 40, isBaseUnit: false, price: 118000, wholesalePrice: 115000, barcode: '8994567000405' },
      ],
    },
    {
      sku: 'BRG-MIE-002',
      barcode: '8994567000410',
      name: 'Indomie Kuah Ayam Bawang 69g',
      categoryId: createdCategories['CAT-MIE'],
      baseUnit: 'BKS',
      currentStock: 1200, // 30 dus @ 40 bks
      minStock: 120,
      purchasePrice: 2650,
      description: 'Mie kuah kaldu ayam bawang gurih beraroma bawang goreng',
      units: [
        { unitName: 'BKS', conversionFactor: 1, isBaseUnit: true, price: 3100, wholesalePrice: 2900, barcode: '8994567000410' },
        { unitName: 'DUS (40 BKS)', conversionFactor: 40, isBaseUnit: false, price: 114000, wholesalePrice: 111000, barcode: '8994567000411' },
      ],
    },
    {
      sku: 'BRG-MIE-003',
      barcode: '8994567000420',
      name: 'Indomie Kuah Soto Mie 70g',
      categoryId: createdCategories['CAT-MIE'],
      baseUnit: 'BKS',
      currentStock: 1200, // 30 dus @ 40 bks
      minStock: 120,
      purchasePrice: 2650,
      description: 'Mie kuah soto mie segar kuah kuning jeruk nipis',
      units: [
        { unitName: 'BKS', conversionFactor: 1, isBaseUnit: true, price: 3100, wholesalePrice: 2900, barcode: '8994567000420' },
        { unitName: 'DUS (40 BKS)', conversionFactor: 40, isBaseUnit: false, price: 114000, wholesalePrice: 111000, barcode: '8994567000421' },
      ],
    },
    {
      sku: 'BRG-MIE-004',
      barcode: '8994567000430',
      name: 'Mie Sedaap Goreng 90g',
      categoryId: createdCategories['CAT-MIE'],
      baseUnit: 'BKS',
      currentStock: 1000, // 25 dus @ 40 bks
      minStock: 120,
      purchasePrice: 2700,
      description: 'Mie goreng sedaap kriuk-kriuk bawang goreng renyah',
      units: [
        { unitName: 'BKS', conversionFactor: 1, isBaseUnit: true, price: 3200, wholesalePrice: 2950, barcode: '8994567000430' },
        { unitName: 'DUS (40 BKS)', conversionFactor: 40, isBaseUnit: false, price: 116000, wholesalePrice: 113000, barcode: '8994567000431' },
      ],
    },

    // --- 6. TELUR & SUSU ---
    {
      sku: 'BRG-TLR-001',
      barcode: '8997890000707',
      name: 'Telur Ayam Ras Negeri Segar',
      categoryId: createdCategories['CAT-TLR'],
      baseUnit: 'KG',
      currentStock: 250, // 25 peti @ 10kg
      minStock: 50,
      purchasePrice: 25000,
      description: 'Telur ayam ras segar langsung dari peternak harian tanpa retak',
      units: [
        { unitName: 'KG', conversionFactor: 1, isBaseUnit: true, price: 28500, wholesalePrice: 27500, barcode: '8997890000707' },
        { unitName: 'PETI (10 KG)', conversionFactor: 10, isBaseUnit: false, price: 275000, wholesalePrice: 268000, barcode: '8997890000708' },
      ],
    },
    {
      sku: 'BRG-TLR-002',
      barcode: '8998901000808',
      name: 'Susu Kental Manis Frisian Flag Putih 370g',
      categoryId: createdCategories['CAT-TLR'],
      baseUnit: 'KALENG',
      currentStock: 480, // 10 dus @ 48 kaleng
      minStock: 48,
      purchasePrice: 10500,
      description: 'Susu kental manis lezat bernutrisi untuk martabak, es dan kopi',
      units: [
        { unitName: 'KALENG', conversionFactor: 1, isBaseUnit: true, price: 12500, wholesalePrice: 12000, barcode: '8998901000808' },
        { unitName: 'DUS (48 KALENG)', conversionFactor: 48, isBaseUnit: false, price: 565000, wholesalePrice: 555000, barcode: '8998901000809' },
      ],
    },
    {
      sku: 'BRG-TLR-003',
      barcode: '8998901000818',
      name: 'Susu Kental Manis Frisian Flag Cokelat 370g',
      categoryId: createdCategories['CAT-TLR'],
      baseUnit: 'KALENG',
      currentStock: 384, // 8 dus @ 48 kaleng
      minStock: 48,
      purchasePrice: 10500,
      description: 'Susu kental manis rasa cokelat legit pekat',
      units: [
        { unitName: 'KALENG', conversionFactor: 1, isBaseUnit: true, price: 12500, wholesalePrice: 12000, barcode: '8998901000818' },
        { unitName: 'DUS (48 KALENG)', conversionFactor: 48, isBaseUnit: false, price: 565000, wholesalePrice: 555000, barcode: '8998901000819' },
      ],
    },

    // --- 7. KOPI, TEH & MINUMAN SACHET ---
    {
      sku: 'BRG-KOP-001',
      barcode: '8996789000606',
      name: 'Kopi Kapal Api Special Mix 24g',
      categoryId: createdCategories['CAT-KOP'],
      baseUnit: 'SCH',
      currentStock: 2400, // 20 dus @ 120 sch (240 renceng)
      minStock: 240,
      purchasePrice: 1150,
      description: 'Kopi bubuk hitam dengan gula murni beraroma kuat mantap',
      units: [
        { unitName: 'SCH', conversionFactor: 1, isBaseUnit: true, price: 1500, wholesalePrice: 1400, barcode: '8996789000606' },
        { unitName: 'RENCENG (10 SCH)', conversionFactor: 10, isBaseUnit: false, price: 13500, wholesalePrice: 13000, barcode: '8996789000607' },
        { unitName: 'DUS (120 SCH)', conversionFactor: 120, isBaseUnit: false, price: 155000, wholesalePrice: 150000, barcode: '8996789000608' },
      ],
    },
    {
      sku: 'BRG-KOP-002',
      barcode: '8996789000615',
      name: 'Kopi Good Day Mocacinno 20g',
      categoryId: createdCategories['CAT-KOP'],
      baseUnit: 'SCH',
      currentStock: 1800, // 15 dus @ 120 sch
      minStock: 120,
      purchasePrice: 1200,
      description: 'Kopi instan rasa moka lezat cocok disajikan dingin atau hangat',
      units: [
        { unitName: 'SCH', conversionFactor: 1, isBaseUnit: true, price: 1700, wholesalePrice: 1500, barcode: '8996789000615' },
        { unitName: 'RENCENG (10 SCH)', conversionFactor: 10, isBaseUnit: false, price: 14500, wholesalePrice: 14000, barcode: '8996789000616' },
        { unitName: 'DUS (120 SCH)', conversionFactor: 120, isBaseUnit: false, price: 165000, wholesalePrice: 160000, barcode: '8996789000617' },
      ],
    },
    {
      sku: 'BRG-KOP-003',
      barcode: '8996789000620',
      name: 'Teh Celup SariWangi Asli Isi 25',
      categoryId: createdCategories['CAT-KOP'],
      baseUnit: 'BOX',
      currentStock: 240, // 10 dus @ 24 box
      minStock: 48,
      purchasePrice: 6200,
      description: 'Teh celup berkualitas pilihan keluarga Indonesia',
      units: [
        { unitName: 'BOX', conversionFactor: 1, isBaseUnit: true, price: 7500, wholesalePrice: 7000, barcode: '8996789000620' },
        { unitName: 'DUS (24 BOX)', conversionFactor: 24, isBaseUnit: false, price: 165000, wholesalePrice: 160000, barcode: '8996789000621' },
      ],
    },

    // --- 8. BUMBU DAPUR & PENYEDAP ---
    {
      sku: 'BRG-BMB-001',
      barcode: '8997891000901',
      name: 'Garam Halus Beryodium Dolphin 500g',
      categoryId: createdCategories['CAT-BMB'],
      baseUnit: 'BKS',
      currentStock: 400, // 20 bal @ 20 bks
      minStock: 40,
      purchasePrice: 3500,
      description: 'Garam meja beryodium halus gurih higienis',
      units: [
        { unitName: 'BKS', conversionFactor: 1, isBaseUnit: true, price: 4500, wholesalePrice: 4000, barcode: '8997891000901' },
        { unitName: 'BAL (20 BKS)', conversionFactor: 20, isBaseUnit: false, price: 82000, wholesalePrice: 78000, barcode: '8997891000902' },
      ],
    },
    {
      sku: 'BRG-BMB-002',
      barcode: '8997891000910',
      name: 'Royco Rasa Ayam 8g',
      categoryId: createdCategories['CAT-BMB'],
      baseUnit: 'SCH',
      currentStock: 2880, // 10 bal @ 288 sch (240 renceng)
      minStock: 288,
      purchasePrice: 450,
      description: 'Bumbu pelezat masakan rasa kaldu ayam mantap',
      units: [
        { unitName: 'SCH', conversionFactor: 1, isBaseUnit: true, price: 600, wholesalePrice: 500, barcode: '8997891000910' },
        { unitName: 'RENCENG (12 SCH)', conversionFactor: 12, isBaseUnit: false, price: 6000, wholesalePrice: 5500, barcode: '8997891000911' },
        { unitName: 'BAL (288 SCH)', conversionFactor: 288, isBaseUnit: false, price: 140000, wholesalePrice: 135000, barcode: '8997891000912' },
      ],
    },
    {
      sku: 'BRG-BMB-003',
      barcode: '8997891000920',
      name: 'Kecap Manis Bango Pouch 520ml',
      categoryId: createdCategories['CAT-BMB'],
      baseUnit: 'POUCH',
      currentStock: 180, // 15 dus @ 12 pouch
      minStock: 24,
      purchasePrice: 21000,
      description: 'Kecap manis hitam pekat dari kedelai hitam malika pilihan',
      units: [
        { unitName: 'POUCH', conversionFactor: 1, isBaseUnit: true, price: 24500, wholesalePrice: 23500, barcode: '8997891000920' },
        { unitName: 'DUS (12 POUCH)', conversionFactor: 12, isBaseUnit: false, price: 275000, wholesalePrice: 268000, barcode: '8997891000921' },
      ],
    },
    {
      sku: 'BRG-BMB-004',
      barcode: '8997891000930',
      name: 'Saus Sambal ABC Extra Pedas 135ml',
      categoryId: createdCategories['CAT-BMB'],
      baseUnit: 'BTL',
      currentStock: 240, // 10 dus @ 24 btl
      minStock: 24,
      purchasePrice: 6500,
      description: 'Saus sambal cabe segar pedas mantap',
      units: [
        { unitName: 'BTL', conversionFactor: 1, isBaseUnit: true, price: 8000, wholesalePrice: 7500, barcode: '8997891000930' },
        { unitName: 'DUS (24 BTL)', conversionFactor: 24, isBaseUnit: false, price: 175000, wholesalePrice: 170000, barcode: '8997891000931' },
      ],
    },

    // --- 9. SABUN & KEBERSIHAN RUMAH ---
    {
      sku: 'BRG-SBN-001',
      barcode: '8998902001001',
      name: 'Sabun Cuci Piring Sunlight Jeruk Nipis 650ml',
      categoryId: createdCategories['CAT-SBN'],
      baseUnit: 'POUCH',
      currentStock: 240, // 20 dus @ 12 pouch
      minStock: 24,
      purchasePrice: 13200,
      description: 'Pembersih piring ekstrak jeruk nipis asli ampuh hilangkan lemak membandel',
      units: [
        { unitName: 'POUCH', conversionFactor: 1, isBaseUnit: true, price: 15500, wholesalePrice: 14800, barcode: '8998902001001' },
        { unitName: 'DUS (12 POUCH)', conversionFactor: 12, isBaseUnit: false, price: 175000, wholesalePrice: 170000, barcode: '8998902001002' },
      ],
    },
    {
      sku: 'BRG-SBN-002',
      barcode: '8998902001010',
      name: 'Deterjen Daia Bunga 850g',
      categoryId: createdCategories['CAT-SBN'],
      baseUnit: 'BKS',
      currentStock: 180, // 15 dus @ 12 bks
      minStock: 24,
      purchasePrice: 16500,
      description: 'Deterjen bubuk aroma bunga segar busa melimpah wangi tahan lama',
      units: [
        { unitName: 'BKS', conversionFactor: 1, isBaseUnit: true, price: 19500, wholesalePrice: 18500, barcode: '8998902001010' },
        { unitName: 'DUS (12 BKS)', conversionFactor: 12, isBaseUnit: false, price: 225000, wholesalePrice: 218000, barcode: '8998902001011' },
      ],
    },

    // --- 10. PERAWATAN DIRI & MANDI ---
    {
      sku: 'BRG-BTH-001',
      barcode: '8998903001101',
      name: 'Sabun Mandi Lifebuoy Total 10 110g',
      categoryId: createdCategories['CAT-BTH'],
      baseUnit: 'BATANG',
      currentStock: 360, // 5 dus @ 72 batang (90 pack @ 4)
      minStock: 36,
      purchasePrice: 4200,
      description: 'Sabun batang antibakterial perlindungan kuman keluarga',
      units: [
        { unitName: 'BATANG', conversionFactor: 1, isBaseUnit: true, price: 5500, wholesalePrice: 5000, barcode: '8998903001101' },
        { unitName: 'PACK (4 BATANG)', conversionFactor: 4, isBaseUnit: false, price: 20000, wholesalePrice: 19000, barcode: '8998903001102' },
        { unitName: 'DUS (72 BATANG)', conversionFactor: 72, isBaseUnit: false, price: 335000, wholesalePrice: 325000, barcode: '8998903001103' },
      ],
    },

    // --- 11. MINUMAN KEMASAN & AIR MINERAL ---
    {
      sku: 'BRG-MNM-001',
      barcode: '8999014001201',
      name: 'Air Mineral Aqua Botol 600ml',
      categoryId: createdCategories['CAT-MNM'],
      baseUnit: 'BOTOL',
      currentStock: 720, // 30 dus @ 24 botol
      minStock: 72,
      purchasePrice: 2600,
      description: 'Air mineral pegunungan alami murni higienis botol 600ml',
      units: [
        { unitName: 'BOTOL', conversionFactor: 1, isBaseUnit: true, price: 3500, wholesalePrice: 3000, barcode: '8999014001201' },
        { unitName: 'DUS (24 BOTOL)', conversionFactor: 24, isBaseUnit: false, price: 68000, wholesalePrice: 65000, barcode: '8999014001202' },
      ],
    },
    {
      sku: 'BRG-MNM-002',
      barcode: '8999014001210',
      name: 'Teh Pucuk Harum 350ml',
      categoryId: createdCategories['CAT-MNM'],
      baseUnit: 'BOTOL',
      currentStock: 600, // 25 dus @ 24 botol
      minStock: 72,
      purchasePrice: 2700,
      description: 'Minuman teh melati segar pucuk daun teh pilihan rasa pas tidak nyangkut di leher',
      units: [
        { unitName: 'BOTOL', conversionFactor: 1, isBaseUnit: true, price: 3500, wholesalePrice: 3200, barcode: '8999014001210' },
        { unitName: 'DUS (24 BOTOL)', conversionFactor: 24, isBaseUnit: false, price: 75000, wholesalePrice: 72000, barcode: '8999014001211' },
      ],
    },

    // --- 12. PLASTIK & PERLENGKAPAN TOKO ---
    {
      sku: 'BRG-PLT-001',
      barcode: '8999125001301',
      name: 'Kantong Kresek Bening Wayang 24',
      categoryId: createdCategories['CAT-PLT'],
      baseUnit: 'PACK',
      currentStock: 250, // 5 bal @ 50 pack
      minStock: 50,
      purchasePrice: 11500,
      description: 'Kantong plastik kresek bening tebal kuat tidak mudah robek ukuran 24',
      units: [
        { unitName: 'PACK', conversionFactor: 1, isBaseUnit: true, price: 14000, wholesalePrice: 13000, barcode: '8999125001301' },
        { unitName: 'IKAT (5 PACK)', conversionFactor: 5, isBaseUnit: false, price: 65000, wholesalePrice: 62000, barcode: '8999125001302' },
        { unitName: 'BAL (50 PACK)', conversionFactor: 50, isBaseUnit: false, price: 610000, wholesalePrice: 590000, barcode: '8999125001303' },
      ],
    },
    {
      sku: 'BRG-PLT-002',
      barcode: '8999125001310',
      name: 'Tali Rafia Cap Lonceng Super 1kg',
      categoryId: createdCategories['CAT-PLT'],
      baseUnit: 'ROLL',
      currentStock: 100, // 10 bal @ 10 roll
      minStock: 20,
      purchasePrice: 18000,
      description: 'Tali rafia gulungan 1kg hitam kuat lentur untuk ikat kardus dan karung',
      units: [
        { unitName: 'ROLL', conversionFactor: 1, isBaseUnit: true, price: 22000, wholesalePrice: 20500, barcode: '8999125001310' },
        { unitName: 'BAL (10 ROLL)', conversionFactor: 10, isBaseUnit: false, price: 205000, wholesalePrice: 198000, barcode: '8999125001311' },
      ],
    },
  ];

  console.log(`📦 Memasukkan ${wholesaleProducts.length} produk sembako grosir lengkap dengan multi-satuan & audit saldo awal...`);

  for (const prod of wholesaleProducts) {
    const { units, ...productData } = prod;

    const createdProduct = await prisma.product.create({
      data: {
        ...productData,
        units: {
          create: units,
        },
        stockMovements: {
          create: {
            type: 'IN',
            quantity: prod.currentStock,
            previousStock: 0,
            currentStock: prod.currentStock,
            referenceType: 'INITIAL',
            note: 'Saldo awal toko grosir sembako',
            userId: createdUsers[Role.OWNER].id,
          },
        },
      },
    });

    console.log(`✓ Produk siap: ${createdProduct.name} (${createdProduct.sku}) - ${units.length} satuan`);
  }

  // 5. Data Pelanggan Grosir & Toko Langganan
  const customersData = [
    {
      code: 'CUST-001',
      name: 'Toko Kelontong Berkah Ibu Ani',
      phone: '0813-4567-8901',
      address: 'Jl. Pasar Anyar No. 12, Surabaya',
      tier: 'GROSIR',
      creditLimit: 15000000, // Plafon 15 juta
    },
    {
      code: 'CUST-002',
      name: 'Warung Makan Barokah Pak Slamet',
      phone: '0813-4567-8902',
      address: 'Jl. Raya Darmo Permai No. 8, Surabaya',
      tier: 'REGULAR',
      creditLimit: 5000000, // Plafon 5 juta
    },
    {
      code: 'CUST-003',
      name: 'Toko Madura 24 Jam Sumber Rejeki',
      phone: '0813-4567-8903',
      address: 'Jl. Manyar Kertoarjo No. 55, Surabaya',
      tier: 'VIP',
      creditLimit: 30000000, // Plafon 30 juta
    },
    {
      code: 'CUST-004',
      name: 'Kantin Sekolah Harapan Bangsa',
      phone: '0813-4567-8904',
      address: 'Jl. Dharmahusada Indah No. 101, Surabaya',
      tier: 'REGULAR',
      creditLimit: 3000000,
    },
    {
      code: 'CUST-005',
      name: 'Katering Sejahtera Bu Hj. Mahmudah',
      phone: '0813-4567-8905',
      address: 'Jl. Kutisari Indah Utara Blok D-4',
      tier: 'GROSIR',
      creditLimit: 20000000,
    },
  ];

  for (const c of customersData) {
    await prisma.customer.upsert({
      where: { code: c.code },
      update: { name: c.name, phone: c.phone, address: c.address, tier: c.tier, creditLimit: c.creditLimit },
      create: c,
    });
  }
  console.log(`✓ Master ${customersData.length} pelanggan grosir siap.`);

  // 6. Data Supplier / Distributor Grosir Sembako
  const suppliersData = [
    {
      code: 'SUPP-001',
      name: 'PT Indofood CBP Sukses Makmur Tbk',
      contactPerson: 'Bapak Hendra (Sales Kanvas)',
      phone: '0812-3456-7801',
      address: 'Kawasan Industri Rungkut Surabaya',
    },
    {
      code: 'SUPP-002',
      name: 'PT Salim Ivomas Pratama (Bimoli Distributor)',
      contactPerson: 'Ibu Ratna (Order Desk)',
      phone: '0812-3456-7802',
      address: 'Jl. Margomulyo Indah No. 45 Surabaya',
    },
    {
      code: 'SUPP-003',
      name: 'CV Lumbung Padi Makmur (Grosir Beras & Tani)',
      contactPerson: 'Haji Mansur',
      phone: '0812-3456-7803',
      address: 'Sentra Penggilingan Padi Lamongan',
    },
    {
      code: 'SUPP-004',
      name: 'PT Santos Jaya Abadi (Kapal Api Distr.)',
      contactPerson: 'Bapak David',
      phone: '0812-3456-7804',
      address: 'Jl. Raya Gilang Sepanjang Sidoarjo',
    },
    {
      code: 'SUPP-005',
      name: 'PT Unilever Indonesia Distributor (Sabun & Bumbu)',
      contactPerson: 'Bapak Agus Gunawan',
      phone: '0812-3456-7805',
      address: 'Kawasan Pergudangan Margomulyo Permai',
    },
    {
      code: 'SUPP-006',
      name: 'CV Sumber Manis Nusantara (Gula Gulaku & GMP)',
      contactPerson: 'Ibu Linda Wijaya',
      phone: '0812-3456-7806',
      address: 'Jl. Kalianak Barat No. 88 Surabaya',
    },
    {
      code: 'SUPP-007',
      name: 'Agen Telur Segar Blitar Barokah',
      contactPerson: 'Pak Joko Peternak',
      phone: '0812-3456-7807',
      address: 'Sentra Telur Ayam Ras Blitar - Kediri',
    },
  ];

  for (const s of suppliersData) {
    await prisma.supplier.upsert({
      where: { code: s.code },
      update: { name: s.name, contactPerson: s.contactPerson, phone: s.phone, address: s.address },
      create: s,
    });
  }
  console.log(`✓ Master ${suppliersData.length} supplier distributor resmi siap.`);

  // 7. Pengaturan Toko Grosir
  await prisma.storeSetting.upsert({
    where: { id: 1 },
    update: {
      storeName: 'Grosir Sembako Nusantara (ZGroup)',
      tagline: 'Pusat Kulakan & Eceran Sembako Murah',
      address: 'Jl. Pasar Induk Kramat Jati Blok C No. 12-14, Jakarta',
      phone: '0812-3456-7890',
    },
    create: {
      id: 1,
      storeName: 'Grosir Sembako Nusantara (ZGroup)',
      tagline: 'Pusat Kulakan & Eceran Sembako Murah',
      address: 'Jl. Pasar Induk Kramat Jati Blok C No. 12-14, Jakarta',
      phone: '0812-3456-7890',
      footerReceipt: 'Terima kasih atas kunjungan & kerjasama Anda!\nBarang yang sudah dibeli tidak dapat ditukar/dikembalikan kecuali cacat saat diterima.',
      paperSize: '58mm',
    },
  });
  console.log('✓ Store settings dikonfigurasi.');

  console.log('\n🎉 SELURUH DATA DUMMY BERHASIL DIBERSIHKAN DAN DIGANTIKAN DATA GROSIR RESMI!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
