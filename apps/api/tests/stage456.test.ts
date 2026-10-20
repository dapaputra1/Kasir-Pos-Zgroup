import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/prisma';

describe('GrosirPOS Stage 4, 5, 6 Integration Tests', () => {
  let ownerToken: string;
  let cashierToken: string;
  let testCustomerId: number;
  let testProductId: number;

  beforeAll(async () => {
    // 1. Authenticate Owner
    const ownerRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'owner@grosirpos.com', password: 'password123' });
    expect(ownerRes.status).toBe(200);
    ownerToken = ownerRes.body.data.token;

    // 2. Authenticate Cashier
    const cashierRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'kasir@grosirpos.com', password: 'password123' });
    expect(cashierRes.status).toBe(200);
    cashierToken = cashierRes.body.data.token;

    // 3. Find test customer & product
    const customer = await prisma.customer.findFirst();
    expect(customer).toBeDefined();
    testCustomerId = customer!.id;

    const product = await prisma.product.findFirst();
    expect(product).toBeDefined();
    testProductId = product!.id;
  });

  describe('Stage 4: Customer & Receivables API', () => {
    it('should list customers and include debt summary', async () => {
      const res = await request(app)
        .get('/api/customers')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0]).toHaveProperty('totalDebt');
    });

    it('should create a new customer with tier and credit limit', async () => {
      const code = `CUST-TEST-${Date.now().toString().slice(-4)}`;
      const res = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          code,
          name: 'Warung Sambal Maknyus',
          phone: '081299887766',
          tier: 'GROSIR',
          creditLimit: 5000000,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.code).toBe(code);
      expect(res.body.data.tier).toBe('GROSIR');
      expect(Number(res.body.data.creditLimit)).toBe(5000000);
    });

    it('should fetch receivables summary', async () => {
      const res = await request(app)
        .get('/api/customers/receivables/summary')
        .set('Authorization', `Bearer ${cashierToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('totalReceivables');
      expect(res.body.data).toHaveProperty('activeCustomersCount');
    });
  });

  describe('Stage 5: User Management & Inventory Opname API', () => {
    let createdUserId: number;

    it('should allow Owner to create a new Cashier staff', async () => {
      const testEmail = `staff_${Date.now()}@grosirpos.com`;
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Kasir Shift Pagi Baru',
          email: testEmail,
          password: 'password123',
          role: 'CASHIER',
          phone: '081234567899',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.role).toBe('CASHIER');
      createdUserId = res.body.data.id;
    });

    it('should allow Owner to change staff password', async () => {
      const res = await request(app)
        .patch(`/api/users/${createdUserId}/password`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          newPassword: 'newsecurepassword2026',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject Cashier attempting to access User Management (RBAC)', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${cashierToken}`);

      expect(res.status).toBe(403);
    });

    it('should list inventory movements log', async () => {
      const res = await request(app)
        .get('/api/inventory/movements')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should process physical stock opname count and auto-adjust discrepancies', async () => {
      const product = await prisma.product.findUniqueOrThrow({ where: { id: testProductId } });
      const currentStock = Number(product.currentStock);
      const newPhysical = currentStock + 5; // Simulating physical count has 5 more items

      const res = await request(app)
        .post('/api/inventory/opname')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          items: [
            {
              productId: testProductId,
              physicalStock: newPhysical,
              note: 'Uji Opname Fisik Akhir Bulan',
            },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.data.totalAdjusted).toBe(1);

      // Verify product stock in DB updated to physical count
      const updated = await prisma.product.findUniqueOrThrow({ where: { id: testProductId } });
      expect(Number(updated.currentStock)).toBe(newPhysical);
    });
  });

  describe('Stage 6: Financial Reports, P&L, and CSV Export API', () => {
    it('should compute Profit & Loss (Laba Rugi) with revenue and HPP', async () => {
      const res = await request(app)
        .get('/api/reports/profit-loss')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('totalRevenue');
      expect(res.body.data).toHaveProperty('totalCogs');
      expect(res.body.data).toHaveProperty('grossProfit');
    });

    it('should return top selling products', async () => {
      const res = await request(app)
        .get('/api/reports/top-products?limit=5')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should return cashflow summary', async () => {
      const res = await request(app)
        .get('/api/reports/cashflow')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('cashIn');
      expect(res.body.data).toHaveProperty('cashOut');
      expect(res.body.data).toHaveProperty('netCashflow');
    });

    it('should export sales and purchases data as CSV', async () => {
      const res = await request(app)
        .get('/api/reports/export/sales')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('No. Faktur');
    });
  });
});
