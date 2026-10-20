import { Router } from 'express';
import { PurchaseController } from '../controllers/purchaseController';
import { authenticate, requireRole } from '../middlewares/authMiddleware';
import { validateRequest } from '../middlewares/validate';
import { createPurchaseSchema, purchasePaymentSchema } from '../validations/purchaseValidation';

const router = Router();

// Summary metrics
router.get('/summary', authenticate, requireRole(['OWNER', 'ADMIN', 'WAREHOUSE']), PurchaseController.getSummary);

// List & Detail
router.get('/', authenticate, requireRole(['OWNER', 'ADMIN', 'WAREHOUSE']), PurchaseController.list);
router.get('/:id', authenticate, requireRole(['OWNER', 'ADMIN', 'WAREHOUSE']), PurchaseController.getById);

// Record purchase & restock (Owner, Admin, and Warehouse)
router.post(
  '/',
  authenticate,
  requireRole(['OWNER', 'ADMIN', 'WAREHOUSE']),
  validateRequest(createPurchaseSchema),
  PurchaseController.create
);

// Record debt payment / pelunasan hutang tempo (Owner & Admin only)
router.post(
  '/:id/payments',
  authenticate,
  requireRole(['OWNER', 'ADMIN']),
  validateRequest(purchasePaymentSchema),
  PurchaseController.recordPayment
);

export default router;
