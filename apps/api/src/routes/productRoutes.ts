import { Router } from 'express';
import { ProductController } from '../controllers/productController';
import { authenticate, requireRole } from '../middlewares/authMiddleware';
import { validateRequest, validateQuery } from '../middlewares/validate';
import {
  createProductSchema,
  updateProductSchema,
  adjustStockSchema,
  productQuerySchema,
} from '../validations/productValidation';

const router = Router();

// Read operations - all authenticated users
router.get('/', authenticate, validateQuery(productQuerySchema), ProductController.list);
router.get('/barcode/:code', authenticate, ProductController.getByBarcode);
router.get('/:id', authenticate, ProductController.getById);

// Create product - OWNER & ADMIN
router.post(
  '/',
  authenticate,
  requireRole(['OWNER', 'ADMIN']),
  validateRequest(createProductSchema),
  ProductController.create
);

// Update product - OWNER & ADMIN
router.put(
  '/:id',
  authenticate,
  requireRole(['OWNER', 'ADMIN']),
  validateRequest(updateProductSchema),
  ProductController.update
);

// Stock adjustment - OWNER, ADMIN, WAREHOUSE
router.post(
  '/:id/adjust-stock',
  authenticate,
  requireRole(['OWNER', 'ADMIN', 'WAREHOUSE']),
  validateRequest(adjustStockSchema),
  ProductController.adjustStock
);

// Delete/deactivate product - OWNER & ADMIN
router.delete('/:id', authenticate, requireRole(['OWNER', 'ADMIN']), ProductController.delete);

export default router;
