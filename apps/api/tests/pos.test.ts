import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app';

describe('GrosirPOS Stage 2: POS Cashier & Barcode Scanning Tests', () => {
  let cashierToken = '';
  let ownerToken = '';
  let testProductId: number;
  let testUnitId: number;
  let testProductBarcode = '8994567000404'; // Indomie Goreng
  let createdOrderId: number;
  let initialStock = 0;

  it('should authenticate cashier and owner', async () => {
    const cashierRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'kasir@grosirpos.com', password: 'password123' });
    expect(cashierRes.status).toBe(200);
    cashierToken = cashierRes.body.data.token;

    const ownerRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'owner@grosirpos.com', password: 'password123' });
    expect(ownerRes.status).toBe(200);
    ownerToken = ownerRes.body.data.token;
  });

  describe('Barcode Scanning Feature', () => {
    it('should scan product by barcode and match product & unit details', async () => {
      const res = await request(app)
        .get(`/api/pos/scan/${testProductBarcode}`)
        .set('Authorization', `Bearer ${cashierToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.product).toBeDefined();
      expect(res.body.data.product.name).toContain('Indomie');
      expect(res.body.data.matchedUnit).toBeDefined();

      testProductId = res.body.data.product.id;
      testUnitId = res.body.data.matchedUnit.id;
      initialStock = Number(res.body.data.product.currentStock);
    });

    it('should return 404 when scanning non-existent barcode', async () => {
      const res = await request(app)
        .get('/api/pos/scan/9999999999999')
        .set('Authorization', `Bearer ${cashierToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('PRODUCT_NOT_FOUND');
    });
  });

  describe('POS Checkout & ACID Transaction', () => {
    it('should process checkout successfully and reduce stock accurately', async () => {
      const quantityToBuy = 5; // 5 BKS
      const res = await request(app)
        .post('/api/pos/checkout')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          paymentMethod: 'CASH',
          amountPaid: 50000,
          items: [
            {
              productId: testProductId,
              productUnitId: testUnitId,
              quantity: quantityToBuy,
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.invoiceNumber).toMatch(/^INV-\d{8}-\d{4}$/);
      expect(res.body.data.items.length).toBe(1);
      expect(res.body.data.items[0].productName).toContain('Indomie');
      expect(Number(res.body.data.totalAmount)).toBeGreaterThan(0);
      expect(Number(res.body.data.changeAmount)).toBe(
        50000 - Number(res.body.data.totalAmount)
      );

      createdOrderId = res.body.data.id;

      // Verify stock was reduced in database
      const prodRes = await request(app)
        .get(`/api/products/${testProductId}`)
        .set('Authorization', `Bearer ${cashierToken}`);

      expect(Number(prodRes.body.data.currentStock)).toBe(initialStock - quantityToBuy);
    });

    it('should reject checkout if stock is insufficient', async () => {
      const res = await request(app)
        .post('/api/pos/checkout')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          paymentMethod: 'CASH',
          amountPaid: 100000000,
          items: [
            {
              productId: testProductId,
              productUnitId: testUnitId,
              quantity: 999999, // Impossible quantity
            },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INSUFFICIENT_STOCK');
    });

    it('should reject cash checkout if amountPaid is less than totalAmount', async () => {
      const res = await request(app)
        .post('/api/pos/checkout')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          paymentMethod: 'CASH',
          amountPaid: 100, // Insufficient cash
          items: [
            {
              productId: testProductId,
              productUnitId: testUnitId,
              quantity: 2,
            },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INSUFFICIENT_PAYMENT');
    });
  });

  describe('Sales History & Invoice Details', () => {
    it('should list sales history with summary aggregates', async () => {
      const res = await request(app)
        .get('/api/pos/orders')
        .set('Authorization', `Bearer ${cashierToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.meta.summary.totalRevenue).toBeDefined();
    });

    it('should get order details by ID for receipt printing', async () => {
      const res = await request(app)
        .get(`/api/pos/orders/${createdOrderId}`)
        .set('Authorization', `Bearer ${cashierToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(createdOrderId);
      expect(res.body.data.items.length).toBe(1);
      expect(res.body.data.user).toBeDefined();
    });
  });
});
