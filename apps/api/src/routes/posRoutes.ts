import { Router } from 'express';
import { PosController } from '../controllers/posController';
import { authenticate, requireRole } from '../middlewares/authMiddleware';
import { validateRequest, validateQuery } from '../middlewares/validate';
import { checkoutSchema, orderQuerySchema } from '../validations/orderValidation';

const router = Router();

// 1. Barcode scanning for fast POS entry (all authenticated cashiers/admins/owners)
router.get(
  '/scan/:code',
  authenticate,
  requireRole(['OWNER', 'ADMIN', 'CASHIER']),
  PosController.scanBarcode
);

// 2. Search catalog for quick POS item selection
router.get(
  '/catalog',
  authenticate,
  requireRole(['OWNER', 'ADMIN', 'CASHIER']),
  PosController.searchCatalog
);

// 3. Process Checkout with ACID transaction
router.post(
  '/checkout',
  authenticate,
  requireRole(['OWNER', 'ADMIN', 'CASHIER']),
  validateRequest(checkoutSchema),
  PosController.checkout
);

// 4. Sales History & Receipt Details
router.get(
  '/orders',
  authenticate,
  requireRole(['OWNER', 'ADMIN', 'CASHIER']),
  validateQuery(orderQuerySchema),
  PosController.listOrders
);

router.get(
  '/orders/:id',
  authenticate,
  requireRole(['OWNER', 'ADMIN', 'CASHIER']),
  PosController.getOrderById
);

export default router;
