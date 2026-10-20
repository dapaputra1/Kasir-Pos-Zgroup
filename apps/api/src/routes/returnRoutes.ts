import { Router } from 'express';
import { ReturnController } from '../controllers/returnController';
import { authenticate, requireRole } from '../middlewares/authMiddleware';
import { validateRequest } from '../middlewares/validate';
import { createSaleReturnSchema, createPurchaseReturnSchema } from '../validations/returnValidation';

const router = Router();

router.use(authenticate);

// Retur Penjualan (Owner, Admin, Kasir)
router.post(
  '/sales',
  requireRole(['OWNER', 'ADMIN', 'CASHIER']),
  validateRequest(createSaleReturnSchema),
  ReturnController.createSaleReturn
);
router.get(
  '/sales',
  requireRole(['OWNER', 'ADMIN', 'CASHIER']),
  ReturnController.getSaleReturns
);

// Retur Pembelian Supplier (Owner, Admin, Gudang)
router.post(
  '/purchases',
  requireRole(['OWNER', 'ADMIN', 'WAREHOUSE']),
  validateRequest(createPurchaseReturnSchema),
  ReturnController.createPurchaseReturn
);
router.get(
  '/purchases',
  requireRole(['OWNER', 'ADMIN', 'WAREHOUSE']),
  ReturnController.getPurchaseReturns
);

export default router;
