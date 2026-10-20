import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/prisma';

describe('GrosirPOS Stage 3: Supplier & Purchase (Kulakan Restock) Tests', () => {
  let ownerToken: string;
  let warehouseToken: string;
  let cashierToken: string;
  let testSupplierId: number;
  let testProductId: number;
  let testProductUnitId: number | null = null;
  let initialStock: number = 0;

  beforeAll(async () => {
    // 1. Authenticate Owner
    const ownerRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'owner@grosirpos.com', password: 'password123' });
    expect(ownerRes.status).toBe(200);
    ownerToken = ownerRes.body.data.token;

    // 2. Authenticate Warehouse
    const whRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'gudang@grosirpos.com', password: 'password123' });
    expect(whRes.status).toBe(200);
    warehouseToken = whRes.body.data.token;

    // 3. Authenticate Cashier
    const cashierRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'kasir@grosirpos.com', password: 'password123' });
    expect(cashierRes.status).toBe(200);
    cashierToken = cashierRes.body.data.token;

    // 4. Fetch an active supplier
    const supplier = await prisma.supplier.findFirst({
      where: { isActive: true },
    });
    expect(supplier).toBeDefined();
    testSupplierId = supplier!.id;

    // 5. Fetch product with units (e.g. Indomie or Bimoli)
    const product = await prisma.product.findFirst({
      where: { sku: 'BRG-MIE-001' },
      include: { units: true },
    });
    expect(product).toBeDefined();
    testProductId = product!.id;
    initialStock = Number(product!.currentStock);

    // Find a multi-unit (e.g. DUS)
    const dusUnit = product!.units.find((u) => u.conversionFactor.toNumber() > 1);
    if (dusUnit) {
      testProductUnitId = dusUnit.id;
    }
  });

  describe('Supplier Management Endpoints', () => {
    it('should list all suppliers for authenticated users', async () => {
      const res = await request(app)
        .get('/api/suppliers')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('should allow Owner and Admin to create a new supplier', async () => {
      const newCode = `SUPP-TEST-${Date.now().toString().slice(-4)}`;
      const res = await request(app)
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          code: newCode,
          name: 'Distributor Sembako Mandiri Jaya',
          contactPerson: 'Ko Ahok',
          phone: '081987654321',
          address: 'Komplek Pergudangan Margomulyo Permai',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.code).toBe(newCode);
      expect(res.body.data.name).toBe('Distributor Sembako Mandiri Jaya');
    });

    it('should reject supplier creation from Cashier (RBAC restriction)', async () => {
      const res = await request(app)
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          name: 'Supplier Ilegal',
        });

      expect(res.status).toBe(403);
    });
  });

  describe('Purchase / Restock Transactions', () => {
    let createdPurchaseId: number;

    it('should successfully record CASH purchase, increment product stock, and create StockMovement IN', async () => {
      const buyQtyDus = 5; // 5 DUS @ 40 BKS = +200 BKS
      const costPerDus = 115000;

      const res = await request(app)
        .post('/api/purchases')
        .set('Authorization', `Bearer ${warehouseToken}`)
        .send({
          supplierId: testSupplierId,
          supplierInvoiceNo: 'SJ-INDOFOOD-9912',
          paymentType: 'CASH',
          items: [
            {
              productId: testProductId,
              productUnitId: testProductUnitId,
              quantity: buyQtyDus,
              unitCost: costPerDus,
              updateProductCost: true,
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      const purchase = res.body.data;
      expect(purchase.purchaseNumber).toMatch(/^PB-\d{8}-\d{4}$/);
      expect(purchase.paymentType).toBe('CASH');
      expect(purchase.paymentStatus).toBe('PAID');
      expect(Number(purchase.totalAmount)).toBe(buyQtyDus * costPerDus);

      // Verify Product currentStock incremented in DB
      const updatedProduct = await prisma.product.findUniqueOrThrow({
        where: { id: testProductId },
      });
      const expectedStock = initialStock + 5 * 40; // 200 BKS added
      expect(Number(updatedProduct.currentStock)).toBe(expectedStock);

      // Verify StockMovement IN created
      const movement = await prisma.stockMovement.findFirst({
        where: {
          productId: testProductId,
          referenceType: 'PURCHASE',
          referenceId: purchase.purchaseNumber,
        },
      });
      expect(movement).toBeDefined();
      expect(movement!.type).toBe('IN');
      expect(Number(movement!.quantity)).toBe(200);

      // Verify HPP (purchasePrice) updated
      const expectedHpp = 115000 / 40; // 2875
      expect(Number(updatedProduct.purchasePrice)).toBe(expectedHpp);
    });

    it('should record TEMPO (hutang dagang) purchase with UNPAID status and allow debt settlement', async () => {
      const res = await request(app)
        .post('/api/purchases')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          supplierId: testSupplierId,
          supplierInvoiceNo: 'FAKTUR-TEMPO-001',
          paymentType: 'TEMPO',
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          amountPaid: 0,
          notes: 'Kulakan beras tempo 14 hari',
          items: [
            {
              productId: testProductId,
              quantity: 10,
              unitCost: 3000, // beli eceran 10 BKS @ 3000 = 30.000
            },
          ],
        });

      expect(res.status).toBe(201);
      const purchase = res.body.data;
      expect(purchase.paymentType).toBe('TEMPO');
      expect(purchase.paymentStatus).toBe('UNPAID');
      expect(Number(purchase.totalAmount)).toBe(30000);
      expect(Number(purchase.amountPaid)).toBe(0);
      createdPurchaseId = purchase.id;

      // Now record partial payment (e.g. 10.000)
      const pay1Res = await request(app)
        .post(`/api/purchases/${createdPurchaseId}/payments`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          amount: 10000,
          paymentMethod: 'TRANSFER',
          note: 'Cicilan 1 transfer BCA',
        });

      expect(pay1Res.status).toBe(200);
      expect(pay1Res.body.data.purchase.paymentStatus).toBe('PARTIAL');
      expect(Number(pay1Res.body.data.purchase.amountPaid)).toBe(10000);

      // Now pay the remainder (20.000) -> status should become PAID
      const pay2Res = await request(app)
        .post(`/api/purchases/${createdPurchaseId}/payments`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          amount: 20000,
          paymentMethod: 'CASH',
          note: 'Pelunasan sisa tempo',
        });

      expect(pay2Res.status).toBe(200);
      expect(pay2Res.body.data.purchase.paymentStatus).toBe('PAID');
      expect(Number(pay2Res.body.data.purchase.amountPaid)).toBe(30000);
    });

    it('should retrieve purchase summary metrics', async () => {
      const res = await request(app)
        .get('/api/purchases/summary')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.monthlyPurchaseCount).toBeGreaterThan(0);
      expect(res.body.data.activeSuppliersCount).toBeGreaterThan(0);
    });
  });
});
