import { Router } from 'express';
import { SupplierController } from '../controllers/supplierController';
import { authenticate, requireRole } from '../middlewares/authMiddleware';
import { validateRequest } from '../middlewares/validate';
import { createSupplierSchema, updateSupplierSchema } from '../validations/supplierValidation';

const router = Router();

// Authenticated users (Owner, Admin, Warehouse, Cashier) can view suppliers
router.get('/', authenticate, SupplierController.list);
router.get('/:id', authenticate, SupplierController.getById);

// Owner & Admin can manage suppliers
router.post(
  '/',
  authenticate,
  requireRole(['OWNER', 'ADMIN']),
  validateRequest(createSupplierSchema),
  SupplierController.create
);

router.put(
  '/:id',
  authenticate,
  requireRole(['OWNER', 'ADMIN']),
  validateRequest(updateSupplierSchema),
  SupplierController.update
);

router.delete('/:id', authenticate, requireRole(['OWNER', 'ADMIN']), SupplierController.delete);

export default router;
