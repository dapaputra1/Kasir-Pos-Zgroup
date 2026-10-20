import { Router } from 'express';
import { CategoryController } from '../controllers/categoryController';
import { authenticate, requireRole } from '../middlewares/authMiddleware';
import { validateRequest } from '../middlewares/validate';
import { createCategorySchema, updateCategorySchema } from '../validations/categoryValidation';

const router = Router();

// Everyone authenticated can view categories
router.get('/', authenticate, CategoryController.list);
router.get('/:id', authenticate, CategoryController.getById);

// Only OWNER & ADMIN can create/update/delete categories
router.post(
  '/',
  authenticate,
  requireRole(['OWNER', 'ADMIN']),
  validateRequest(createCategorySchema),
  CategoryController.create
);

router.put(
  '/:id',
  authenticate,
  requireRole(['OWNER', 'ADMIN']),
  validateRequest(updateCategorySchema),
  CategoryController.update
);

router.delete('/:id', authenticate, requireRole(['OWNER', 'ADMIN']), CategoryController.delete);

export default router;
