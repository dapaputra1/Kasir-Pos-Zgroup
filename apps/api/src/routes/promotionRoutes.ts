import { Router } from 'express';
import { PromotionController } from '../controllers/promotionController';
import { authenticate, requireRole } from '../middlewares/authMiddleware';
import { validateRequest } from '../middlewares/validate';
import {
  createPromotionSchema,
  updatePromotionSchema,
  validateCouponSchema,
} from '../validations/promotionValidation';

const router = Router();

// 1. Coupon validation for POS checkout (accessible by CASHIER, ADMIN, OWNER)
router.post(
  '/validate',
  authenticate,
  requireRole(['OWNER', 'ADMIN', 'CASHIER']),
  validateRequest(validateCouponSchema),
  PromotionController.validateCoupon
);

// 2. Promotion management (OWNER and ADMIN)
router.get('/', authenticate, requireRole(['OWNER', 'ADMIN']), PromotionController.list);
router.get('/:id', authenticate, requireRole(['OWNER', 'ADMIN']), PromotionController.getById);

router.post(
  '/',
  authenticate,
  requireRole(['OWNER', 'ADMIN']),
  validateRequest(createPromotionSchema),
  PromotionController.create
);

router.put(
  '/:id',
  authenticate,
  requireRole(['OWNER', 'ADMIN']),
  validateRequest(updatePromotionSchema),
  PromotionController.update
);

router.delete('/:id', authenticate, requireRole(['OWNER', 'ADMIN']), PromotionController.delete);

export default router;
