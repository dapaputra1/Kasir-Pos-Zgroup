import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Memulai pengosongan data untuk persiapan produk real (Opsi A)...');

  // 1. Hapus transaksi penjualan & retur penjualan
  console.log('1/8 Menghapus transaksi penjualan dan retur penjualan...');
  const delSaleReturnItems = await prisma.saleReturnItem.deleteMany({});
  const delSaleReturns = await prisma.saleReturn.deleteMany({});
  const delOrderPayments = await prisma.orderPayment.deleteMany({});
  const delOrderItems = await prisma.orderItem.deleteMany({});
  const delOrders = await prisma.order.deleteMany({});

  // 2. Hapus transaksi pembelian & retur pembelian
  console.log('2/8 Menghapus transaksi pembelian dan retur pembelian...');
  const delPurchaseReturnItems = await prisma.purchaseReturnItem.deleteMany({});
  const delPurchaseReturns = await prisma.purchaseReturn.deleteMany({});
  const delPurchasePayments = await prisma.purchasePayment.deleteMany({});
  const delPurchaseItems = await prisma.purchaseItem.deleteMany({});
  const delPurchases = await prisma.purchase.deleteMany({});

  // 3. Hapus mutasi stok & shift kasir
  console.log('3/8 Menghapus log mutasi stok dan shift kasir...');
  const delStockMovements = await prisma.stockMovement.deleteMany({});
  const delCashShifts = await prisma.cashShift.deleteMany({});

  // 4. Hapus paket bundling, price tiers, satuan, dan master produk
  console.log('4/8 Menghapus katalog produk, paket bundling, dan multi-satuan...');
  const delBundleItems = await prisma.bundleItem.deleteMany({});
  const delPriceTiers = await prisma.priceTier.deleteMany({});
  const delProductUnits = await prisma.productUnit.deleteMany({});
  const delProducts = await prisma.product.deleteMany({});

  // 5. Hapus promosi dummy
  console.log('5/8 Menghapus promosi dummy...');
  const delPromotions = await prisma.promotion.deleteMany({});

  // 6. Hapus pelanggan dummy
  console.log('6/8 Menghapus data pelanggan dummy...');
  const delCustomers = await prisma.customer.deleteMany({});

  // 7. Hapus supplier dummy
  console.log('7/8 Menghapus data supplier dummy...');
  const delSuppliers = await prisma.supplier.deleteMany({});

  // 8. Hapus user test sementara (tetap simpan owner asli & akun official)
  console.log('8/8 Membersihkan user akun test staff...');
  const delTestUsers = await prisma.user.deleteMany({
    where: {
      email: { startsWith: 'staff_' },
    },
  });

  const remainingCategories = await prisma.category.count();
  const remainingUsers = await prisma.user.count();
  const storeSetting = await prisma.storeSetting.findFirst();

  console.log('\n=============================================');
  console.log('✅ DATABASE BERHASIL DIKOSONGKAN (OPSI A)!');
  console.log('=============================================');
  console.log(`- Produk Dihapus          : ${delProducts.count}`);
  console.log(`- Multi-Satuan Dihapus    : ${delProductUnits.count}`);
  console.log(`- Penjualan Dihapus       : ${delOrders.count}`);
  console.log(`- Pembelian Dihapus       : ${delPurchases.count}`);
  console.log(`- Pelanggan Dihapus       : ${delCustomers.count}`);
  console.log(`- Supplier Dihapus        : ${delSuppliers.count}`);
  console.log(`- Kategori Dipertahankan  : ${remainingCategories}`);
  console.log(`- Pengguna Aktif Tersimpan: ${remainingUsers}`);
  console.log(`- Toko Terkonfigurasi     : ${storeSetting?.storeName || '-'}`);
  console.log('=============================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Gagal mengosongkan database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

