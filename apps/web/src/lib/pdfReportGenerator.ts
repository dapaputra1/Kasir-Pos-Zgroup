import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ProfitLossData, CashflowData, TopProduct } from '../types/report';
import { formatRupiah, formatNumber } from './utils';

export interface ReportPdfOptions {
  storeName?: string;
  storeAddress?: string;
  startDate?: string;
  endDate?: string;
}

export class PdfReportGenerator {
  /**
   * Helper to draw clean enterprise header
   */
  private static drawHeader(
    doc: jsPDF,
    title: string,
    subtitle: string,
    options: ReportPdfOptions = {}
  ): number {
    const pageWidth = doc.internal.pageSize.getWidth();
    const storeName = options.storeName || 'GROSIR SEMBAKO ZGROUP';
    const storeAddress = options.storeAddress || 'Sistem Kasir & Operasional Toko Grosir Sembako';

    // Top primary emerald band
    doc.setFillColor(23, 107, 88); // #176B58
    doc.rect(0, 0, pageWidth, 8, 'F');

    // Store Name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(23, 107, 88);
    doc.text(storeName, 14, 20);

    // Tagline / Address
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(storeAddress, 14, 25);

    // Document Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text(title.toUpperCase(), 14, 34);

    // Date Range & Timestamp
    const periodText = options.startDate && options.endDate
      ? `Periode: ${options.startDate} s/d ${options.endDate}`
      : options.startDate
      ? `Mulai: ${options.startDate}`
      : 'Semua Periode Riwayat';
    const printedAt = `Dicetak: ${new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })}`;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`${subtitle} • ${periodText}`, 14, 39);
    doc.text(printedAt, pageWidth - 14, 39, { align: 'right' });

    // Divider line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(14, 42, pageWidth - 14, 42);

    return 48; // Y position for content
  }

  /**
   * Helper to draw signature block
   */
  private static drawSignatureBlock(doc: jsPDF, startY: number) {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Check if enough space, otherwise add page
    let y = startY + 15;
    if (y + 35 > pageHeight) {
      doc.addPage();
      y = 25;
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);

    // Left Signature: Petugas Administrasi
    doc.text('Dibuat & Diverifikasi Oleh,', 25, y);
    doc.text('( Petugas Administrasi / Kasir )', 25, y + 25);

    // Right Signature: Pemilik Toko
    doc.text('Mengetahui & Menyetujui,', pageWidth - 70, y);
    doc.text('( Pemilik / Owner Toko )', pageWidth - 70, y + 25);
  }

  /**
   * 1. Export Laporan Finansial (Laba Rugi & Arus Kas) ke PDF
   */
  static exportProfitLossPdf(
    plData: ProfitLossData | undefined,
    cashflowData: CashflowData | undefined,
    topProducts: TopProduct[] | undefined,
    options: ReportPdfOptions = {}
  ) {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    let currentY = this.drawHeader(
      doc,
      'Laporan Laba Rugi & Arus Kas Toko',
      'Ringkasan Finansial Eksekutif',
      options
    );

    // Section 1: Ringkasan Utama Laba Rugi Table
    autoTable(doc, {
      startY: currentY,
      head: [['Komponen Laba Rugi', 'Nilai (Rp)', 'Keterangan Analisis']],
      body: [
        ['Total Omzet Penjualan Kotor (Sales)', formatRupiah(plData?.totalRevenue ?? (plData as any)?.totalSales ?? 0), `${formatNumber(plData?.totalOrders ?? (plData as any)?.totalOrderCount ?? 0)} transaksi kasir`],
        ['Potongan Diskon Penjualan', `(${formatRupiah(plData?.totalDiscount ?? 0)})`, 'Promosi & potongan harga konsumen'],
        ['Omzet Bersih Penjualan (Net Revenue)', formatRupiah(((plData?.totalRevenue ?? 0) - (plData?.totalDiscount ?? 0))), 'Penjualan riil setelah diskon'],
        ['Harga Pokok Penjualan (HPP / COGS)', `(${formatRupiah(plData?.totalCogs ?? (plData as any)?.cogs ?? 0)})`, 'Biaya modal pokok barang sembako terjual'],
        ['Laba Kotor Toko (Gross Profit)', formatRupiah(plData?.grossProfit ?? 0), `Margin Kotor: ${Number(plData?.grossMargin ?? 0).toFixed(1)}%`],
        ['Total Belanja Stok Supplier (PO Kulakan)', formatRupiah(plData?.totalPurchases ?? 0), `${formatNumber(plData?.totalPurchaseCount ?? 0)} faktur pembelian supplier`],
      ],
      theme: 'grid',
      headStyles: {
        fillColor: [23, 107, 88],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8.5,
      },
      styles: {
        fontSize: 8,
        cellPadding: 2.5,
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 70 },
        1: { halign: 'right', fontStyle: 'bold', cellWidth: 45 },
        2: { textColor: [100, 116, 139] },
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;

    // Section 2: Ringkasan Arus Kas Masuk & Keluar (Cashflow)
    autoTable(doc, {
      startY: currentY,
      head: [['Arus Kas Masuk & Keluar (Riil)', 'Nominal (Rp)', 'Status Kas']],
      body: [
        ['Total Kas Masuk (Penerimaan Tunai)', formatRupiah(cashflowData?.cashIn.total ?? 0), `Penjualan Tunai: ${formatRupiah(cashflowData?.cashIn.salesPaid ?? 0)} • Bon: ${formatRupiah(cashflowData?.cashIn.receivablesPaid ?? 0)}`],
        ['Total Kas Keluar (Pengeluaran Tunai)', formatRupiah(cashflowData?.cashOut.total ?? 0), `Kulakan Tunai: ${formatRupiah(cashflowData?.cashOut.purchasesPaid ?? 0)} • Hutang: ${formatRupiah(cashflowData?.cashOut.payablesPaid ?? 0)}`],
        ['Arus Kas Bersih (Net Cashflow)', formatRupiah(cashflowData?.netCashflow ?? 0), (cashflowData?.netCashflow ?? 0) >= 0 ? 'Surplus Operasional Positif' : 'Defisit Pengeluaran Lebih Besar'],
      ],
      theme: 'grid',
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8.5,
      },
      styles: {
        fontSize: 8,
        cellPadding: 2.5,
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 70 },
        1: { halign: 'right', fontStyle: 'bold', cellWidth: 45 },
        2: { textColor: [100, 116, 139] },
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;

    // Section 3: 5 Produk Terlaris (Fast Moving)
    if (topProducts && topProducts.length > 0) {
      autoTable(doc, {
        startY: currentY,
        head: [['Peringkat', 'Nama Produk Sembako', 'Qty Terjual', 'Omzet (Rp)', 'Laba Kotor (Rp)', 'Margin']],
        body: topProducts.slice(0, 5).map((p, idx) => [
          `#${idx + 1}`,
          p.productName,
          `${formatNumber(p.totalQty ?? (p as any).totalQuantity ?? 0)}`,
          formatRupiah(p.totalRevenue ?? 0),
          formatRupiah(p.profit ?? (p as any).grossProfit ?? 0),
          `${Number(p.margin ?? (p as any).marginPercentage ?? 0).toFixed(1)}%`,
        ]),
        theme: 'striped',
        headStyles: {
          fillColor: [78, 116, 105],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8,
        },
        styles: {
          fontSize: 7.5,
          cellPadding: 2,
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 15 },
          1: { fontStyle: 'bold', cellWidth: 65 },
          2: { halign: 'right', cellWidth: 28 },
          3: { halign: 'right', cellWidth: 28 },
          4: { halign: 'right', cellWidth: 28 },
          5: { halign: 'center', cellWidth: 18 },
        },
      });

      currentY = (doc as any).lastAutoTable.finalY;
    }

    this.drawSignatureBlock(doc, currentY);

    const filename = `Laporan_Laba_Rugi_${options.startDate || 'all'}_sd_${options.endDate || 'now'}.pdf`;
    doc.save(filename);
  }

  /**
   * 2. Export Laporan Transaksi Penjualan (Sales) ke PDF
   */
  static exportSalesListPdf(
    orders: any[],
    options: ReportPdfOptions = {}
  ) {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    let currentY = this.drawHeader(
      doc,
      'Laporan Riwayat Transaksi Penjualan',
      `Total ${orders.length} Faktur Penjualan`,
      options
    );

    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
    const totalPaid = orders.reduce((sum, o) => sum + Number(o.amountPaid || 0), 0);

    autoTable(doc, {
      startY: currentY,
      head: [['No. Faktur', 'Tanggal', 'Kasir', 'Pelanggan', 'Metode', 'Status', 'Total Tagihan', 'Dibayar']],
      body: orders.map((o) => [
        o.invoiceNumber,
        new Date(o.createdAt).toLocaleDateString('id-ID'),
        o.user?.name || 'Kasir',
        o.customer?.name || 'Umum',
        o.paymentMethod,
        o.paymentStatus,
        formatRupiah(o.totalAmount),
        formatRupiah(o.amountPaid),
      ]),
      foot: [[
        'TOTAL PENJUALAN',
        '',
        '',
        '',
        '',
        '',
        formatRupiah(totalRevenue),
        formatRupiah(totalPaid),
      ]],
      theme: 'grid',
      headStyles: {
        fillColor: [23, 107, 88],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
      },
      footStyles: {
        fillColor: [241, 245, 249],
        textColor: [15, 23, 42],
        fontStyle: 'bold',
        fontSize: 8,
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
      },
      columnStyles: {
        0: { fontStyle: 'bold' },
        6: { halign: 'right', fontStyle: 'bold' },
        7: { halign: 'right' },
      },
    });

    currentY = (doc as any).lastAutoTable.finalY;
    this.drawSignatureBlock(doc, currentY);

    const filename = `Laporan_Penjualan_${options.startDate || 'all'}_sd_${options.endDate || 'now'}.pdf`;
    doc.save(filename);
  }

  /**
   * 3. Export Laporan Pembelian Supplier (Purchases) ke PDF
   */
  static exportPurchasesListPdf(
    purchases: any[],
    options: ReportPdfOptions = {}
  ) {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    let currentY = this.drawHeader(
      doc,
      'Laporan Pembelian & Restock Supplier',
      `Total ${purchases.length} Faktur Kulakan`,
      options
    );

    const totalPurchase = purchases.reduce((sum, p) => sum + Number(p.totalAmount || 0), 0);
    const totalPaid = purchases.reduce((sum, p) => sum + Number(p.amountPaid || 0), 0);

    autoTable(doc, {
      startY: currentY,
      head: [['No. PO Kulakan', 'Tanggal', 'Supplier', 'No. Faktur Pemasok', 'Sistem Bayar', 'Status', 'Total (Rp)', 'Terbayar (Rp)']],
      body: purchases.map((p) => [
        p.purchaseNumber,
        new Date(p.purchaseDate).toLocaleDateString('id-ID'),
        p.supplier?.name || '-',
        p.supplierInvoiceNo || '-',
        p.paymentType,
        p.paymentStatus,
        formatRupiah(p.totalAmount),
        formatRupiah(p.amountPaid),
      ]),
      foot: [[
        'TOTAL PEMBELIAN KULAKAN',
        '',
        '',
        '',
        '',
        '',
        formatRupiah(totalPurchase),
        formatRupiah(totalPaid),
      ]],
      theme: 'grid',
      headStyles: {
        fillColor: [37, 99, 235], // Blue
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
      },
      footStyles: {
        fillColor: [241, 245, 249],
        textColor: [15, 23, 42],
        fontStyle: 'bold',
        fontSize: 8,
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
      },
      columnStyles: {
        0: { fontStyle: 'bold' },
        6: { halign: 'right', fontStyle: 'bold' },
        7: { halign: 'right' },
      },
    });

    currentY = (doc as any).lastAutoTable.finalY;
    this.drawSignatureBlock(doc, currentY);

    const filename = `Laporan_Pembelian_${options.startDate || 'all'}_sd_${options.endDate || 'now'}.pdf`;
    doc.save(filename);
  }

  /**
   * 4. Export Laporan Valuasi Inventaris & Stok ke PDF
   */
  static exportInventoryValuationPdf(
    products: any[],
    options: ReportPdfOptions = {}
  ) {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    let currentY = this.drawHeader(
      doc,
      'Laporan Valuasi Aset & Saldo Inventaris',
      `Total ${products.length} Komoditas Sembako`,
      options
    );

    const totalAssetValue = products.reduce(
      (sum, p) => sum + Number(p.currentStock || 0) * Number(p.purchasePrice || 0),
      0
    );

    autoTable(doc, {
      startY: currentY,
      head: [['SKU / Barcode', 'Nama Produk', 'Kategori', 'Stok Fisik', 'HPP (Modal)', 'Estimasi Nilai Aset']],
      body: products.map((p) => {
        const stock = Number(p.currentStock || 0);
        const hpp = Number(p.purchasePrice || 0);
        const assetValue = stock * hpp;

        return [
          p.sku || p.barcode,
          p.name,
          p.category?.name || 'Umum',
          `${formatNumber(stock)} ${p.baseUnit}`,
          formatRupiah(hpp),
          formatRupiah(assetValue),
        ];
      }),
      foot: [[
        'TOTAL VALUASI NILAI ASET GUDANG',
        '',
        '',
        '',
        '',
        formatRupiah(totalAssetValue),
      ]],
      theme: 'grid',
      headStyles: {
        fillColor: [16, 149, 114], // Teal Emerald
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
      },
      footStyles: {
        fillColor: [241, 245, 249],
        textColor: [15, 23, 42],
        fontStyle: 'bold',
        fontSize: 8,
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
      },
      columnStyles: {
        0: { fontStyle: 'bold' },
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right', fontStyle: 'bold' },
      },
    });

    currentY = (doc as any).lastAutoTable.finalY;
    this.drawSignatureBlock(doc, currentY);

    const filename = `Laporan_Valuasi_Stok_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(filename);
  }
}
