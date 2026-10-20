import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database for GrosirPOS...');

  // 1. Create Users
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
        password: u.password,
        role: u.role,
        phone: u.phone,
      },
      create: u,
    });
    createdUsers[u.role] = user;
    console.log(`✓ User created/updated: ${user.name} (${user.role}) - ${user.email}`);
  }

  // 2. Categories
  const categoriesData = [
    { code: 'CAT-BRS', name: 'Beras & Biji-bijian', description: 'Aneka beras premium, medium, dan ketan' },
    { code: 'CAT-MYK', name: 'Minyak Goreng & Margarin', description: 'Minyak kelapa sawit botol, pouch, dan jerigen' },
    { code: 'CAT-GLA', name: 'Gula & Pemanis', description: 'Gula pasir putih, kuning, dan gula merah' },
    { code: 'CAT-TPG', name: 'Tepung & Olahan', description: 'Tepung terigu, beras, tapioka, dan maizena' },
    { code: 'CAT-MIE', name: 'Mie Instan, Bihun & Pasta', description: 'Aneka merk mie instan dus dan eceran' },
    { code: 'CAT-KOP', name: 'Kopi, Teh & Minuman Sachet', description: 'Kopi sachet renceng, teh celup, sirup' },
    { code: 'CAT-TLR', name: 'Telur & Susu', description: 'Telur ayam ras negeri, puyuh, susu kental manis' },
    { code: 'CAT-BMB', name: 'Bumbu Dapur & Penyedap', description: 'Garam, penyedap rasa, kecap, saus' },
    { code: 'CAT-SBN', name: 'Sabun & Kebersihan Rumah', description: 'Deterjen, sabun cuci piring, pembersih lantai, pewangi' },
    { code: 'CAT-BTH', name: 'Perawatan Diri & Mandi', description: 'Sabun mandi, shampoo, pasta gigi, sikat gigi' },
    { code: 'CAT-SNK', name: 'Makanan Ringan & Biskuit', description: 'Snack ciki, keripik, wafer, biskuit kaleng' },
    { code: 'CAT-MNM', name: 'Minuman Kemasan & Air Mineral', description: 'Air mineral galon, botol, cup, teh kemasan' },
    { code: 'CAT-GAS', name: 'Gas LPG & Galon', description: 'Tabung gas LPG 3kg, 12kg, air isi ulang' },
    { code: 'CAT-RKK', name: 'Rokok & Korek Api', description: 'Aneka rokok kretek, filter, dan korek gas' },
    { code: 'CAT-BYI', name: 'Kebutuhan Bayi & Anak', description: 'Popok bayi / pampers, minyak telon, bubur bayi' },
    { code: 'CAT-PLT', name: 'Plastik & Perlengkapan Toko', description: 'Kantong kresek, tali rafia, karet gelang, kertas bungkus' },
    { code: 'CAT-KLG', name: 'Makanan Kaleng & Olahan', description: 'Sarden, kornet sapi, susu kental manis kaleng' },
    { code: 'CAT-OBT', name: 'Obat Bebas & P3K', description: 'Minyak kayu putih, tolak angin, plester, obat warung' },
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
  console.log(`✓ Seeded ${categoriesData.length} categories.`);

  // 3. Products with Multi-Units and Initial Stock Movements
  const productsData = [
    {
      sku: 'BRG-BRS-001',
      barcode: '8991234000101',
      name: 'Beras Ramos Setra Rojo Lele Super',
      categoryId: createdCategories['CAT-BRS'],
      baseUnit: 'KG',
      currentStock: 500, // 500 KG = 20 sak 25kg
      minStock: 100,
      purchasePrice: 13000,
      description: 'Beras pulen kualitas premium tanpa pewangi dan pemutih',
      units: [
        { unitName: 'KG', conversionFactor: 1, isBaseUnit: true, price: 14500, wholesalePrice: 14000, barcode: '8991234000101' },
        { unitName: 'SAK 5KG', conversionFactor: 5, isBaseUnit: false, price: 72000, wholesalePrice: 70000, barcode: '8991234000102' },
        { unitName: 'SAK 25KG', conversionFactor: 25, isBaseUnit: false, price: 350000, wholesalePrice: 340000, barcode: '8991234000103' },
      ],
    },
    {
      sku: 'BRG-MYK-001',
      barcode: '8992345000202',
      name: 'Minyak Goreng Bimoli Klasik Pouch 1L',
      categoryId: createdCategories['CAT-MYK'],
      baseUnit: 'POUCH',
      currentStock: 240, // 20 dus @ 12 pouch
      minStock: 48,
      purchasePrice: 17500,
      description: 'Minyak goreng kelapa sawit murni berkualitas tinggi',
      units: [
        { unitName: 'POUCH', conversionFactor: 1, isBaseUnit: true, price: 19500, wholesalePrice: 18500, barcode: '8992345000202' },
        { unitName: 'DUS (12 POUCH)', conversionFactor: 12, isBaseUnit: false, price: 225000, wholesalePrice: 220000, barcode: '8992345000203' },
      ],
    },
    {
      sku: 'BRG-GLA-001',
      barcode: '8993456000303',
      name: 'Gula Pasir Gulaku Kuning Premium',
      categoryId: createdCategories['CAT-GLA'],
      baseUnit: 'KG',
      currentStock: 350,
      minStock: 50,
      purchasePrice: 15800,
      description: 'Gula tebu murni butiran alami rasa manis pas',
      units: [
        { unitName: 'KG', conversionFactor: 1, isBaseUnit: true, price: 17500, wholesalePrice: 17000, barcode: '8993456000303' },
        { unitName: 'KARUNG 50KG', conversionFactor: 50, isBaseUnit: false, price: 840000, wholesalePrice: 825000, barcode: '8993456000304' },
      ],
    },
    {
      sku: 'BRG-MIE-001',
      barcode: '8994567000404',
      name: 'Indomie Goreng Spesial 85g',
      categoryId: createdCategories['CAT-MIE'],
      baseUnit: 'BKS',
      currentStock: 400, // 10 dus @ 40 bks
      minStock: 80,
      purchasePrice: 2750,
      description: 'Mie goreng instan nomor satu di Indonesia',
      units: [
        { unitName: 'BKS', conversionFactor: 1, isBaseUnit: true, price: 3200, wholesalePrice: 3000, barcode: '8994567000404' },
        { unitName: 'DUS (40 BKS)', conversionFactor: 40, isBaseUnit: false, price: 118000, wholesalePrice: 115000, barcode: '8994567000405' },
      ],
    },
    {
      sku: 'BRG-TPG-001',
      barcode: '8995678000505',
      name: 'Tepung Terigu Segitiga Biru 1kg',
      categoryId: createdCategories['CAT-TPG'],
      baseUnit: 'BKS',
      currentStock: 120, // 10 dus @ 12 bks
      minStock: 24,
      purchasePrice: 11200,
      description: 'Tepung terigu serbaguna protein sedang untuk segala olahan',
      units: [
        { unitName: 'BKS', conversionFactor: 1, isBaseUnit: true, price: 13000, wholesalePrice: 12500, barcode: '8995678000505' },
        { unitName: 'DUS (12 BKS)', conversionFactor: 12, isBaseUnit: false, price: 148000, wholesalePrice: 144000, barcode: '8995678000506' },
      ],
    },
    {
      sku: 'BRG-KOP-001',
      barcode: '8996789000606',
      name: 'Kopi Kapal Api Special Mix 24g',
      categoryId: createdCategories['CAT-KOP'],
      baseUnit: 'SCH',
      currentStock: 600, // 5 dus @ 120 sch (atau 60 renceng)
      minStock: 120,
      purchasePrice: 1150,
      description: 'Kopi bubuk instan dengan gula murni beraroma mantap',
      units: [
        { unitName: 'SCH', conversionFactor: 1, isBaseUnit: true, price: 1500, wholesalePrice: 1400, barcode: '8996789000606' },
        { unitName: 'RENCENG (10 SCH)', conversionFactor: 10, isBaseUnit: false, price: 13500, wholesalePrice: 13000, barcode: '8996789000607' },
        { unitName: 'DUS (120 SCH)', conversionFactor: 120, isBaseUnit: false, price: 155000, wholesalePrice: 150000, barcode: '8996789000608' },
      ],
    },
    {
      sku: 'BRG-TLR-001',
      barcode: '8997890000707',
      name: 'Telur Ayam Ras Negeri Segar',
      categoryId: createdCategories['CAT-TLR'],
      baseUnit: 'KG',
      currentStock: 18, // Menipis (di bawah batas minimum 30 KG)
      minStock: 30,
      purchasePrice: 25000,
      description: 'Telur segar langsung dari peternak harian berkualitas',
      units: [
        { unitName: 'KG', conversionFactor: 1, isBaseUnit: true, price: 28500, wholesalePrice: 27500, barcode: '8997890000707' },
        { unitName: 'PETI (10 KG)', conversionFactor: 10, isBaseUnit: false, price: 275000, wholesalePrice: 268000, barcode: '8997890000708' },
      ],
    },
  ];

  for (const prod of productsData) {
    const existing = await prisma.product.findUnique({
      where: { sku: prod.sku },
    });

    if (existing) {
      console.log(`Product ${prod.sku} already exists, skipping...`);
      continue;
    }

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
            note: 'Saldo awal demo toko grosir',
            userId: createdUsers[Role.OWNER].id,
          },
        },
      },
    });

    console.log(`✓ Product created: ${createdProduct.name} (${createdProduct.sku}) with ${units.length} units`);
  }

  // 4. Initial Customers & Suppliers
  const customersData = [
    {
      code: 'CUST-001',
      name: 'Toko Kelontong Berkah Ibu Ani',
      phone: '0813-4567-8901',
      address: 'Jl. Pasar Anyar No. 12',
      tier: 'GROSIR',
      creditLimit: 10000000, // Limit 10 juta
    },
    {
      code: 'CUST-002',
      name: 'Warung Makan Barokah Pak Slamet',
      phone: '0813-4567-8902',
      address: 'Jl. Raya Darmo Permai No. 8',
      tier: 'REGULAR',
      creditLimit: 3000000, // Limit 3 juta
    },
    {
      code: 'CUST-003',
      name: 'Toko Madura 24 Jam Sumber Rejeki',
      phone: '0813-4567-8903',
      address: 'Jl. Manyar Kertoarjo No. 55',
      tier: 'VIP',
      creditLimit: 25000000, // Limit 25 juta
    },
    {
      code: 'CUST-004',
      name: 'Kantin Sekolah Harapan Bangsa',
      phone: '0813-4567-8904',
      address: 'Jl. Dharmahusada Indah No. 101',
      tier: 'REGULAR',
      creditLimit: 2000000,
    },
  ];

  for (const c of customersData) {
    await prisma.customer.upsert({
      where: { code: c.code },
      update: { name: c.name, phone: c.phone, address: c.address, tier: c.tier, creditLimit: c.creditLimit },
      create: c,
    });
  }
  console.log(`✓ Seeded ${customersData.length} customers.`);

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
      contactPerson: 'Ibu Ratna',
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
  ];

  for (const s of suppliersData) {
    await prisma.supplier.upsert({
      where: { code: s.code },
      update: { name: s.name, contactPerson: s.contactPerson, phone: s.phone, address: s.address },
      create: s,
    });
  }
  console.log(`✓ Seeded ${suppliersData.length} suppliers.`);

  // 6. Default Store Settings
  await prisma.storeSetting.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      storeName: 'GrosirPOS Sembako Nusantara',
      tagline: 'Pusat Kulakan & Eceran Sembako Murah',
      address: 'Jl. Pasar Induk Kramat Jati Blok C No. 12-14, Jakarta Timur',
      phone: '0812-3456-7890',
      footerReceipt: 'Terima kasih atas kunjungan Anda!\nBarang yang sudah dibeli tidak dapat ditukar/dikembalikan kecuali rusak saat diterima.',
      paperSize: '58mm',
    },
  });
  console.log('✓ Seeded default store settings.');

  console.log('✓ Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
