import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app';

describe('GrosirPOS Backend API Tests', () => {
  let ownerToken = '';
  let cashierToken = '';
  let createdProductId: number;

  describe('Authentication Endpoints', () => {
    it('should reject login with invalid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'owner@grosirpos.com', password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('salah');
    });

    it('should successfully login as OWNER and return cookie + token', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'owner@grosirpos.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('OWNER');
      expect(res.body.data.token).toBeDefined();

      ownerToken = res.body.data.token;
      // Also check set-cookie header contains token
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
    });

    it('should successfully login as CASHIER', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'kasir@grosirpos.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('CASHIER');
      cashierToken = res.body.data.token;
    });

    it('should get current profile with Bearer token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('owner@grosirpos.com');
      expect(res.body.data.role).toBe('OWNER');
    });

    it('should reject /api/auth/me without token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Product & Multi-Unit Endpoints', () => {
    it('should list products with pagination and category', async () => {
      const res = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].units).toBeDefined();
      expect(res.body.meta.total).toBeDefined();
    });

    it('should prevent CASHIER from creating a product (RBAC 403)', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          sku: 'BRG-TEST-001',
          name: 'Produk Uji Kasir',
          categoryId: 1,
          baseUnit: 'PCS',
          units: [{ unitName: 'PCS', conversionFactor: 1, isBaseUnit: true, price: 5000 }],
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should allow OWNER to create a product with multi-unit and initial stock', async () => {
      const uniqueSuffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      const testSku = `BRG-TEST-${uniqueSuffix}`;
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          sku: testSku,
          barcode: `899${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 1000)}`,
          name: 'Susu Kental Manis Frisian Flag 370g',
          categoryId: 1,
          description: 'Susu kental manis lezat',
          baseUnit: 'KALENG',
          minStock: 24,
          purchasePrice: 10500,
          initialStock: 96, // 2 karton @ 48 kaleng
          units: [
            {
              unitName: 'KALENG',
              conversionFactor: 1,
              isBaseUnit: true,
              price: 12500,
              wholesalePrice: 12000,
            },
            {
              unitName: 'KARTON (48 KALENG)',
              conversionFactor: 48,
              isBaseUnit: false,
              price: 560000,
              wholesalePrice: 550000,
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Susu Kental Manis Frisian Flag 370g');
      expect(Number(res.body.data.currentStock)).toBe(96);
      expect(res.body.data.units.length).toBe(2);

      createdProductId = res.body.data.id;
    });

    it('should perform stock adjustment with audit trail', async () => {
      const res = await request(app)
        .post(`/api/products/${createdProductId}/adjust-stock`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          type: 'IN',
          quantity: 48,
          note: 'Barang masuk tambahan dari supplier',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Number(res.body.data.product.currentStock)).toBe(144); // 96 + 48
      expect(Number(res.body.data.movement.previousStock)).toBe(96);
      expect(Number(res.body.data.movement.currentStock)).toBe(144);
    });

    it('should get product by ID including stock audit history', async () => {
      const res = await request(app)
        .get(`/api/products/${createdProductId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.stockMovements.length).toBe(2); // Initial stock + adjustment
    });
  });

  describe('Dashboard Summary', () => {
    it('should fetch dashboard metrics', async () => {
      const res = await request(app)
        .get('/api/dashboard/summary')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.metrics.totalProducts).toBeGreaterThan(0);
      expect(res.body.data.recentMovements.length).toBeGreaterThan(0);
    });
  });
});
