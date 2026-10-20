import { Router } from 'express';
import { CustomerController } from '../controllers/customerController';
import { authenticate, requireRole } from '../middlewares/authMiddleware';
import { validateRequest } from '../middlewares/validate';
import {
  createCustomerSchema,
  updateCustomerSchema,
  customerPaymentSchema,
} from '../validations/customerValidation';

const router = Router();

// Receivables endpoints
router.get(
  '/receivables/summary',
  authenticate,
  requireRole(['OWNER', 'ADMIN', 'CASHIER']),
  CustomerController.getReceivablesSummary
);

router.get(
  '/receivables',
  authenticate,
  requireRole(['OWNER', 'ADMIN', 'CASHIER']),
  CustomerController.listReceivables
);

router.post(
  '/receivables/:id/payments',
  authenticate,
  requireRole(['OWNER', 'ADMIN', 'CASHIER']),
  validateRequest(customerPaymentSchema),
  CustomerController.recordOrderPayment
);

// Customer CRUD
router.get('/', authenticate, CustomerController.list);
router.get('/:id', authenticate, CustomerController.getById);

router.post(
  '/',
  authenticate,
  requireRole(['OWNER', 'ADMIN', 'CASHIER']),
  validateRequest(createCustomerSchema),
  CustomerController.create
);

router.put(
  '/:id',
  authenticate,
  requireRole(['OWNER', 'ADMIN']),
  validateRequest(updateCustomerSchema),
  CustomerController.update
);

router.delete('/:id', authenticate, requireRole(['OWNER', 'ADMIN']), CustomerController.delete);

export default router;
