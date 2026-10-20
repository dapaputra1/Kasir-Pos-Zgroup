import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/prisma';

describe('GrosirPOS Stage 7, 8, 10 Integration Tests', () => {
  let ownerToken: string;
  let cashierToken: string;
  let testOrderId: number;
  let testPurchaseId: number;
  let testProductId: number;
  let testUnitName: string;

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

    // 3. Find test order & purchase with items (unreturned)
    const order = await prisma.order.findFirst({
      where: {
        status: 'COMPLETED',
        saleReturns: { none: {} },
      },
      include: { items: true },
    });
    if (order && order.items.length > 0) {
      testOrderId = order.id;
      testProductId = order.items[0].productId;
      testUnitName = order.items[0].unitName;
    }

    const purchase = await prisma.purchase.findFirst({
      where: { status: 'RECEIVED' },
      include: { items: true },
    });
    if (purchase) {
      testPurchaseId = purchase.id;
    }
  });

  describe('Stage 7: Cash Shift Management', () => {
    it('should start a new cash shift for cashier', async () => {
      // Pastikan tutup shift lama jika ada dari tes sebelumnya
      const current = await request(app)
        .get('/api/shifts/current')
        .set('Authorization', `Bearer ${cashierToken}`);

      if (current.body.data) {
        await request(app)
          .post('/api/shifts/close')
          .set('Authorization', `Bearer ${cashierToken}`)
          .send({ closingCash: 100000 });
      }

      const res = await request(app)
        .post('/api/shifts/start')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          startingCash: 200000,
          notes: 'Shift Pagi Kasir 1',
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('id');
      expect(Number(res.body.data.startingCash)).toBe(200000);
      expect(res.body.data.status).toBe('OPEN');
    });

    it('should reject opening second shift while one is still open', async () => {
      const res = await request(app)
        .post('/api/shifts/start')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({ startingCash: 100000 });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('ACTIVE_SHIFT_EXISTS');
    });

    it('should get current shift with live metrics', async () => {
      const res = await request(app)
        .get('/api/shifts/current')
        .set('Authorization', `Bearer ${cashierToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.metrics).toBeDefined();
      expect(res.body.data.metrics).toHaveProperty('expectedCash');
    });

    it('should close shift and calculate difference', async () => {
      const res = await request(app)
        .post('/api/shifts/close')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          closingCash: 205000, // Uang fisik di laci
          notes: 'Kas laci surplus 5.000',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('CLOSED');
      expect(res.body.data).toHaveProperty('difference');
      expect(res.body.data.closingCash).toBe(205000);
    });

    it('should list all shifts for owner', async () => {
      const res = await request(app)
        .get('/api/shifts')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.shifts)).toBe(true);
      expect(res.body.data.shifts.length).toBeGreaterThan(0);
    });
  });

  describe('Stage 8: Returns API', () => {
    it('should list sales returns', async () => {
      const res = await request(app)
        .get('/api/returns/sales')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.returns)).toBe(true);
    });

    it('should list purchase returns', async () => {
      const res = await request(app)
        .get('/api/returns/purchases')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.returns)).toBe(true);
    });

    it('should successfully process a sale return if order exists', async () => {
      if (!testOrderId) return;

      const res = await request(app)
        .post('/api/returns/sales')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          orderId: testOrderId,
          reason: 'Bungkus bocor / rusak kemasan',
          refundMethod: 'CASH',
          items: [
            {
              productId: testProductId,
              unitName: testUnitName,
              quantity: 1,
              returnToStock: true,
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('returnNumber');
      expect(res.body.data.returnNumber).toMatch(/^RET-J-/);
      expect(res.body.data.items.length).toBe(1);
    });
  });

  describe('Stage 10: Store Settings API', () => {
    it('should get store settings', async () => {
      const res = await request(app)
        .get('/api/settings')
        .set('Authorization', `Bearer ${cashierToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('storeName');
      expect(res.body.data).toHaveProperty('paperSize');
    });

    it('should update store settings as owner', async () => {
      const res = await request(app)
        .put('/api/settings')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          storeName: 'Grosir Sembako Rezeki Makmur',
          tagline: 'Grosir Terlengkap dan Termurah',
          address: 'Jl. Ahmad Yani No. 100, Surabaya',
          phone: '0812-9876-5432',
          footerReceipt: 'Terima kasih telah berbelanja di Rezeki Makmur!',
          paperSize: '80mm',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.storeName).toBe('Grosir Sembako Rezeki Makmur');
      expect(res.body.data.paperSize).toBe('80mm');
    });

    it('should reject updating store settings by cashier', async () => {
      const res = await request(app)
        .put('/api/settings')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({ storeName: 'Hacker Store' });

      expect(res.status).toBe(403);
    });
  });
});
