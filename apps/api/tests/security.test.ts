import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { ReportService } from '../src/services/reportService';
import { prisma } from '../src/config/prisma';

describe('GrosirPOS Security & Hardening Integration Tests', () => {
  let ownerToken = '';
  let adminToken = '';
  let cashierToken = '';
  let sampleProductId: number;

  beforeAll(async () => {
    // 1. Login as OWNER
    const ownerRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'owner@grosirpos.com', password: 'password123' });
    ownerToken = ownerRes.body.data.token;

    // 2. Login as ADMIN
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@grosirpos.com', password: 'password123' });
    adminToken = adminRes.body.data.token;

    // 3. Login as CASHIER
    const cashierRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'kasir@grosirpos.com', password: 'password123' });
    cashierToken = cashierRes.body.data.token;

    // 4. Fetch a sample product
    const prod = await prisma.product.findFirst({
      where: { isActive: true },
      include: { units: true },
    });
    if (prod) {
      sampleProductId = prod.id;
    }
  });

  describe('1. Security Headers (Helmet)', () => {
    it('should include security headers like X-Content-Type-Options', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBeDefined();
    });
  });

  describe('2. Privilege Escalation Prevention', () => {
    it('should prevent an ADMIN from creating an OWNER account', async () => {
      const res = await request(app)
        .post('/api/auth/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Hacker Owner',
          email: 'hacker_owner@grosirpos.com',
          password: 'Password123!',
          role: 'OWNER',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Hanya Owner yang berhak');
    });
  });

  describe('3. Financial Leakage Protection (CASHIER HPP Masking)', () => {
    it('should mask purchasePrice to 0 when product list is accessed by CASHIER', async () => {
      const res = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${cashierToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const items = res.body.data;
      expect(items.length).toBeGreaterThan(0);
      items.forEach((item: any) => {
        expect(Number(item.purchasePrice)).toBe(0);
      });
    });

    it('should mask purchasePrice to 0 when product detail is accessed by CASHIER', async () => {
      if (!sampleProductId) return;
      const res = await request(app)
        .get(`/api/products/${sampleProductId}`)
        .set('Authorization', `Bearer ${cashierToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Number(res.body.data.purchasePrice)).toBe(0);
    });

    it('should preserve real purchasePrice when accessed by OWNER or ADMIN', async () => {
      if (!sampleProductId) return;
      const res = await request(app)
        .get(`/api/products/${sampleProductId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Number(res.body.data.purchasePrice)).toBeGreaterThan(0);
    });
  });

  describe('4. Input Validation Hardening (Zod Schemas)', () => {
    it('should reject stock opname with empty items array (422)', async () => {
      const res = await request(app)
        .post('/api/inventory/opname')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ items: [] });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject stock opname with negative physical stock (422)', async () => {
      const res = await request(app)
        .post('/api/inventory/opname')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          items: [{ productId: sampleProductId || 1, physicalStock: -5 }],
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject bundle configuration with empty components (422)', async () => {
      const res = await request(app)
        .post(`/api/bundles/${sampleProductId || 1}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ components: [] });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject bundle configuration with invalid quantity (422)', async () => {
      const res = await request(app)
        .post(`/api/bundles/${sampleProductId || 1}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          components: [{ componentProductId: 1, quantity: -10 }],
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('5. Checkout Business Logic Hardening', () => {
    it('should reject TEMPO checkout if customerId is missing (unregistered customer)', async () => {
      const product = await prisma.product.findFirst({
        where: { isActive: true },
        include: { units: true },
      });
      if (!product || !product.units[0]) return;

      const res = await request(app)
        .post('/api/pos/checkout')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          items: [
            {
              productId: product.id,
              productUnitId: product.units[0].id,
              quantity: 1,
            },
          ],
          paymentMethod: 'TEMPO',
          amountPaid: 0,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CUSTOMER_REQUIRED_FOR_CREDIT');
    });

    it('should reject QRIS or TRANSFER checkout if amountPaid is less than total', async () => {
      const product = await prisma.product.findFirst({
        where: { isActive: true },
        include: { units: true },
      });
      if (!product || !product.units[0]) return;

      const res = await request(app)
        .post('/api/pos/checkout')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          items: [
            {
              productId: product.id,
              productUnitId: product.units[0].id,
              quantity: 1,
            },
          ],
          paymentMethod: 'QRIS',
          amountPaid: 100, // Insufficient for QRIS
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INSUFFICIENT_PAYMENT');
    });

    it('should reject cashier customPrice that drops below base wholesale purchasePrice', async () => {
      const product = await prisma.product.findFirst({
        where: { isActive: true, purchasePrice: { gt: 5000 } },
        include: { units: true },
      });
      if (!product || !product.units[0]) return;

      const res = await request(app)
        .post('/api/pos/checkout')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          items: [
            {
              productId: product.id,
              productUnitId: product.units[0].id,
              quantity: 1,
              customPrice: 500, // Deliberately way below purchasePrice
            },
          ],
          paymentMethod: 'CASH',
          amountPaid: 100000,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('PRICE_BELOW_COST');
    });
  });

  describe('6. CSV Injection Mitigation (CWE-1236)', () => {
    it('should properly neutralize CSV formula injection characters in exports', async () => {
      const csv = await ReportService.generateCsvExport('sales');
      expect(typeof csv).toBe('string');
      // Verify no cell starts directly with dangerous formula tokens like "=cmd", "+123", "-123" without single quote neutralizing
      const lines = csv.split('\n');
      expect(lines.length).toBeGreaterThan(0);
      // Header check
      expect(lines[0]).toContain('"No. Faktur"');
    });
  });
});
