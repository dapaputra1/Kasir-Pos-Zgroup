import { PrismaClient, MovementType, PurchasePaymentType, PurchasePaymentStatus, PurchaseStatus, PaymentMethod } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Memulai input data nota kulakan TOKO FAJAR JAYA (JT 261108027)...');

  // 1. Dapatkan User penanggung jawab (Bu Titik / Daffa / Admin)
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: 'tpurwaningsih60@gmail.com' },
        { email: 'fsdaffa610@gmail.com' },
        { role: 'OWNER' },
      ],
    },
    orderBy: { id: 'asc' },
  });

  if (!user) {
    throw new Error('Tidak ditemukan akun User / Owner di database.');
  }

  console.log(`✓ Menggunakan user ID ${user.id} (${user.name})`);

  // 2. Buat atau perbarui Supplier: TOKO FAJAR JAYA
  const supplier = await prisma.supplier.upsert({
    where: { code: 'SUPP-FJR-001' },
    update: {
      name: 'Toko Fajar Jaya',
      phone: '081335078454',
      address: 'Jl. Parang Sampung Magetan',
      contactPerson: 'Sales Toko Fajar Jaya',
      isActive: true,
    },
    create: {
      code: 'SUPP-FJR-001',
      name: 'Toko Fajar Jaya',
      phone: '081335078454',
      address: 'Jl. Parang Sampung Magetan',
      contactPerson: 'Sales Toko Fajar Jaya',
      isActive: true,
    },
  });

  console.log(`✓ Supplier siap: ${supplier.name} (${supplier.code})`);

  // 3. Ambil Kategori yang relevan
  const categories = await prisma.category.findMany();
  const catMap: Record<string, number> = {};
  for (const c of categories) {
    catMap[c.code] = c.id;
  }

  // 4. Data 12 Produk dari Nota Toko Fajar Jaya
  const itemsData = [
    {
      name: 'Gula Pasir RMI',
      sku: 'BRG-GLA-RMI',
      barcode: '8991001001011',
      categoryCode: 'CAT-GLA',
      description: 'Gula pasir kristal putih RMI kemasan sak 50kg',
      baseUnit: 'KG',
      purchasePrice: 17550, // 877.500 / 50
      stockInBase: 50, // 1 Sak @ 50kg
      units: [
        { unitName: 'KG', factor: 1, isBase: true, cost: 17550, price: 18500, wholesalePrice: 18000, barcode: '8991001001011' },
        { unitName: 'SAK (50KG)', factor: 50, isBase: false, cost: 877500, price: 900000, wholesalePrice: 890000, barcode: '8991001001012' },
      ],
      purchaseQty: 1,
      purchaseUnitName: 'SAK (50KG)',
      purchaseUnitCost: 877500,
      subtotal: 877500,
    },
    {
      name: 'Kedelai Dele Bola Super',
      sku: 'BRG-BRS-DLE-BOLA',
      barcode: '8991001002011',
      categoryCode: 'CAT-BRS',
      description: 'Kacang kedelai impor cap Bola kualitas super untuk tempe dan tahu',
      baseUnit: 'KG',
      purchasePrice: 11450, // 572.500 / 50
      stockInBase: 50, // 1 Sak @ 50kg
      units: [
        { unitName: 'KG', factor: 1, isBase: true, cost: 11450, price: 13000, wholesalePrice: 12500, barcode: '8991001002011' },
        { unitName: 'SAK (50KG)', factor: 50, isBase: false, cost: 572500, price: 595000, wholesalePrice: 585000, barcode: '8991001002012' },
      ],
      purchaseQty: 1,
      purchaseUnitName: 'SAK (50KG)',
      purchaseUnitCost: 572500,
      subtotal: 572500,
    },
    {
      name: 'Minyak Goreng Fortune Refill 800ml',
      sku: 'BRG-MYK-FRT-800',
      barcode: '8992345001011',
      categoryCode: 'CAT-MYK',
      description: 'Minyak goreng kelapa sawit Fortune pouch refill 800ml',
      baseUnit: 'POUCH',
      purchasePrice: 17208, // 206.500 / 12
      stockInBase: 36, // 3 Karton @ 12 pouch
      units: [
        { unitName: 'POUCH', factor: 1, isBase: true, cost: 17208, price: 19000, wholesalePrice: 18000, barcode: '8992345001011' },
        { unitName: 'KARTON (12 POUCH)', factor: 12, isBase: false, cost: 206500, price: 216000, wholesalePrice: 210000, barcode: '8992345001012' },
      ],
      purchaseQty: 3,
      purchaseUnitName: 'KARTON (12 POUCH)',
      purchaseUnitCost: 206500,
      subtotal: 619500,
    },
    {
      name: 'Minyak Goreng Fortune Bantal 1 Liter',
      sku: 'BRG-MYK-FRT-1L-BTL',
      barcode: '8992345001021',
      categoryCode: 'CAT-MYK',
      description: 'Minyak goreng Fortune kemasan bantal polybag 1 liter',
      baseUnit: 'BANTAL',
      purchasePrice: 20333, // 244.000 / 12
      stockInBase: 24, // 2 Karton @ 12 bantal
      units: [
        { unitName: 'BANTAL', factor: 1, isBase: true, cost: 20333, price: 22500, wholesalePrice: 21500, barcode: '8992345001021' },
        { unitName: 'KARTON (12 BANTAL)', factor: 12, isBase: false, cost: 244000, price: 255000, wholesalePrice: 250000, barcode: '8992345001022' },
      ],
      purchaseQty: 2,
      purchaseUnitName: 'KARTON (12 BANTAL)',
      purchaseUnitCost: 244000,
      subtotal: 488000,
    },
    {
      name: 'Minyak Goreng Murah Refill 1 Liter',
      sku: 'BRG-MYK-MRH-1L',
      barcode: '8992345001031',
      categoryCode: 'CAT-MYK',
      description: 'Minyak goreng ekonomis pouch refill 1 liter',
      baseUnit: 'POUCH',
      purchasePrice: 16917, // 203.000 / 12
      stockInBase: 12, // 1 Karton @ 12 pouch
      units: [
        { unitName: 'POUCH', factor: 1, isBase: true, cost: 16917, price: 18500, wholesalePrice: 18000, barcode: '8992345001031' },
        { unitName: 'KARTON (12 POUCH)', factor: 12, isBase: false, cost: 203000, price: 215000, wholesalePrice: 210000, barcode: '8992345001032' },
      ],
      purchaseQty: 1,
      purchaseUnitName: 'KARTON (12 POUCH)',
      purchaseUnitCost: 203000,
      subtotal: 203000,
    },
    {
      name: 'Tepung Beras Rose Brand 500g',
      sku: 'BRG-TPG-ROSE-500G',
      barcode: '8992741001011',
      categoryCode: 'CAT-TPG',
      description: 'Tepung beras murni Rose Brand kemasan 500 gram',
      baseUnit: 'BKS',
      purchasePrice: 8800, // 176.000 / 20
      stockInBase: 20, // 1 Karton @ 20 bungkus
      units: [
        { unitName: 'BKS', factor: 1, isBase: true, cost: 8800, price: 10000, wholesalePrice: 9500, barcode: '8992741001011' },
        { unitName: 'KARTON (20 BKS)', factor: 20, isBase: false, cost: 176000, price: 188000, wholesalePrice: 182000, barcode: '8992741001012' },
      ],
      purchaseQty: 1,
      purchaseUnitName: 'KARTON (20 BKS)',
      purchaseUnitCost: 176000,
      subtotal: 176000,
    },
    {
      name: 'Tepung Terigu Cap Payung 25kg',
      sku: 'BRG-TPG-PYG-25KG',
      barcode: '8992741002011',
      categoryCode: 'CAT-TPG',
      description: 'Tepung terigu serbaguna Cap Payung kemasan karung/sak 25kg',
      baseUnit: 'KG',
      purchasePrice: 8920, // 223.000 / 25
      stockInBase: 25, // 1 Sak @ 25kg
      units: [
        { unitName: 'KG', factor: 1, isBase: true, cost: 8920, price: 10500, wholesalePrice: 10000, barcode: '8992741002011' },
        { unitName: 'SAK (25KG)', factor: 25, isBase: false, cost: 223000, price: 235000, wholesalePrice: 230000, barcode: '8992741002012' },
      ],
      purchaseQty: 1,
      purchaseUnitName: 'SAK (25KG)',
      purchaseUnitCost: 223000,
      subtotal: 223000,
    },
    {
      name: 'Kopi Top Gula Aren Renceng',
      sku: 'BRG-KOP-TOP-ARN',
      barcode: '8993005001011',
      categoryCode: 'CAT-KOP',
      description: 'Kopi instan Top Coffee perpaduan kopi dan gula aren legit',
      baseUnit: 'RENCENG',
      purchasePrice: 16500, // 198.000 / 12
      stockInBase: 12, // 1 Karton @ 12 renceng
      units: [
        { unitName: 'RENCENG', factor: 1, isBase: true, cost: 16500, price: 18500, wholesalePrice: 17500, barcode: '8993005001011' },
        { unitName: 'KARTON (12 RENCENG)', factor: 12, isBase: false, cost: 198000, price: 210000, wholesalePrice: 205000, barcode: '8993005001012' },
      ],
      purchaseQty: 1,
      purchaseUnitName: 'KARTON (12 RENCENG)',
      purchaseUnitCost: 198000,
      subtotal: 198000,
    },
    {
      name: 'Minyak Goreng Fitri Botol 200ml',
      sku: 'BRG-MYK-FTR-200',
      barcode: '8992345001041',
      categoryCode: 'CAT-MYK',
      description: 'Minyak goreng kelapa sawit Fitri kemasan botol mini 200ml praktis',
      baseUnit: 'BTL',
      purchasePrice: 4896, // 117.500 / 24
      stockInBase: 48, // 2 Karton @ 24 botol
      units: [
        { unitName: 'BTL', factor: 1, isBase: true, cost: 4896, price: 6000, wholesalePrice: 5500, barcode: '8992345001041' },
        { unitName: 'KARTON (24 BTL)', factor: 24, isBase: false, cost: 117500, price: 128000, wholesalePrice: 124000, barcode: '8992345001042' },
      ],
      purchaseQty: 2,
      purchaseUnitName: 'KARTON (24 BTL)',
      purchaseUnitCost: 117500,
      subtotal: 235000,
    },
    {
      name: 'Royco Kaldu Ayam Renceng',
      sku: 'BRG-BMB-RYC-AYM',
      barcode: '8999999001011',
      categoryCode: 'CAT-BMB',
      description: 'Penyedap rasa bumbu kaldu ayam Royco kemasan renceng',
      baseUnit: 'RENCENG',
      purchasePrice: 5250, // 210.000 / 40
      stockInBase: 40, // 1 Karton @ 40 renceng
      units: [
        { unitName: 'RENCENG', factor: 1, isBase: true, cost: 5250, price: 6000, wholesalePrice: 5500, barcode: '8999999001011' },
        { unitName: 'KARTON (40 RENCENG)', factor: 40, isBase: false, cost: 210000, price: 225000, wholesalePrice: 220000, barcode: '8999999001012' },
      ],
      purchaseQty: 1,
      purchaseUnitName: 'KARTON (40 RENCENG)',
      purchaseUnitCost: 210000,
      subtotal: 210000,
    },
    {
      name: 'Air Mineral Club Gelas 220ml',
      sku: 'BRG-MNM-CLB-220',
      barcode: '8993005002011',
      categoryCode: 'CAT-MNM',
      description: 'Air minum mineral kemasan cup/gelas Club 220ml dus isi 48 gelas',
      baseUnit: 'CUP',
      purchasePrice: 479, // 23.000 / 48
      stockInBase: 480, // 10 Karton @ 48 cup
      units: [
        { unitName: 'CUP', factor: 1, isBase: true, cost: 479, price: 1000, wholesalePrice: 800, barcode: '8993005002011' },
        { unitName: 'DUS (48 CUP)', factor: 48, isBase: false, cost: 23000, price: 27000, wholesalePrice: 25000, barcode: '8993005002012' },
      ],
      purchaseQty: 10,
      purchaseUnitName: 'DUS (48 CUP)',
      purchaseUnitCost: 23000,
      subtotal: 230000,
    },
    {
      name: 'Kopi Torabika Mayor + Gelas Promo',
      sku: 'BRG-KOP-MYR-GLS',
      barcode: '8993005003011',
      categoryCode: 'CAT-KOP',
      description: 'Kopi Torabika Mayor renceng paket promo gratis 1 box gelas',
      baseUnit: 'RENCENG',
      purchasePrice: 16667, // 200.000 / 12
      stockInBase: 12, // 1 Karton @ 12 renceng
      units: [
        { unitName: 'RENCENG', factor: 1, isBase: true, cost: 16667, price: 19000, wholesalePrice: 18000, barcode: '8993005003011' },
        { unitName: 'KARTON (12 RENCENG)', factor: 12, isBase: false, cost: 200000, price: 215000, wholesalePrice: 210000, barcode: '8993005003012' },
      ],
      purchaseQty: 1,
      purchaseUnitName: 'KARTON (12 RENCENG)',
      purchaseUnitCost: 200000,
      subtotal: 200000,
    },
  ];

  // 5. Masukkan Master Produk & Unit ke Database
  console.log('📦 Memasukkan master produk dan unit...');
  const createdProducts: Array<{
    product: any;
    purchaseUnit: any;
    data: (typeof itemsData)[0];
  }> = [];

  for (const item of itemsData) {
    const categoryId = catMap[item.categoryCode];
    if (!categoryId) {
      throw new Error(`Kategori ${item.categoryCode} tidak ditemukan.`);
    }

    const product = await prisma.product.create({
      data: {
        sku: item.sku,
        barcode: item.barcode,
        name: item.name,
        description: item.description,
        categoryId: categoryId,
        baseUnit: item.baseUnit,
        currentStock: item.stockInBase,
        minStock: 5,
        purchasePrice: item.purchasePrice,
        isActive: true,
      },
    });

    let purchaseUnitRecord = null;

    for (const u of item.units) {
      const createdUnit = await prisma.productUnit.create({
        data: {
          productId: product.id,
          unitName: u.unitName,
          conversionFactor: u.factor,
          isBaseUnit: u.isBase,
          price: u.price,
          wholesalePrice: u.wholesalePrice,
          barcode: u.barcode,
        },
      });

      if (u.unitName === item.purchaseUnitName) {
        purchaseUnitRecord = createdUnit;
      }
    }

    createdProducts.push({
      product,
      purchaseUnit: purchaseUnitRecord,
      data: item,
    });

    console.log(`  ✓ Produk: ${product.name} (Stok: ${item.stockInBase} ${item.baseUnit})`);
  }

  // 6. Buat Transaksi Pembelian (Purchase PB-20261108-0001)
  console.log('🧾 Mencatat transaksi pembelian (Nota JT-261108027)...');
  const purchaseNumber = 'PB-20261108-0001';
  const supplierInvoiceNo = 'JT 261108027';
  const totalAmount = 4232500;

  const purchase = await prisma.purchase.create({
    data: {
      purchaseNumber,
      supplierInvoiceNo,
      supplierId: supplier.id,
      userId: user.id,
      purchaseDate: new Date('2026-11-08T19:22:00.000Z'),
      paymentType: PurchasePaymentType.TEMPO,
      paymentStatus: PurchasePaymentStatus.UNPAID,
      dueDate: new Date('2026-11-15T19:22:00.000Z'), // Tempo 7 hari
      subtotal: totalAmount,
      totalAmount: totalAmount,
      amountPaid: 0,
      status: PurchaseStatus.RECEIVED,
      notes: 'Nota Toko Fajar Jaya (Magetan) JT 261108027. Tempo 7 hari (Jatuh tempo: 15/11/2026). + 1 box gelas mayor.',
    },
  });

  // 7. Catat Detail Item Pembelian & Mutasi Stok (StockMovement)
  console.log('📋 Mencatat item pembelian dan mutasi audit stok...');
  for (const cp of createdProducts) {
    const factor = cp.purchaseUnit?.conversionFactor || 1;
    const baseQuantity = Number(cp.data.purchaseQty) * Number(factor);

    await prisma.purchaseItem.create({
      data: {
        purchaseId: purchase.id,
        productId: cp.product.id,
        productUnitId: cp.purchaseUnit?.id || null,
        productName: cp.product.name,
        sku: cp.product.sku,
        unitName: cp.data.purchaseUnitName,
        conversionFactor: factor,
        quantity: cp.data.purchaseQty,
        baseQuantity: baseQuantity,
        unitCost: cp.data.purchaseUnitCost,
        baseCost: cp.data.purchasePrice,
        subtotal: cp.data.subtotal,
      },
    });

    // Audit trail mutasi stok masuk
    await prisma.stockMovement.create({
      data: {
        productId: cp.product.id,
        type: MovementType.IN,
        quantity: baseQuantity,
        previousStock: 0,
        currentStock: baseQuantity,
        referenceType: 'PURCHASE',
        referenceId: purchaseNumber,
        note: `Penerimaan barang kulakan dari Toko Fajar Jaya (Nota JT 261108027)`,
        userId: user.id,
        createdAt: new Date('2026-11-08T19:22:00.000Z'),
      },
    });
  }

  // 8. Pembayaran Tempo (Belum Lunas - UNPAID)
  console.log('⏳ Status pembayaran diset TEMPO 7 hari (UNPAID)...');

  console.log('\n======================================================');
  console.log('✅ SELURUH DATA NOTA TOKO FAJAR JAYA BERHASIL DIINPUT!');
  console.log('======================================================');
  console.log(`- Supplier         : ${supplier.name}`);
  console.log(`- Nomor Faktur Nota: ${supplierInvoiceNo}`);
  console.log(`- Nomor Pembelian  : ${purchaseNumber}`);
  console.log(`- Tanggal Nota     : 08/11/2026 19:22`);
  console.log(`- Total Nominal    : Rp ${totalAmount.toLocaleString('id-ID')}`);
  console.log(`- Jumlah Produk    : ${itemsData.length} Produk Real`);
  console.log('======================================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Gagal menginput nota:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

