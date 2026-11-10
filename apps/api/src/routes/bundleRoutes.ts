import { Router } from 'express';
import { BundleController } from '../controllers/bundleController';
import { authenticate, requireRole } from '../middlewares/authMiddleware';
import { validateRequest } from '../middlewares/validate';
import {
  saveBundleComponentsSchema,
  saveUnitTiersSchema,
} from '../validations/bundleValidation';

const router = Router();

// Everyone with POS access can list bundles
router.get('/', authenticate, requireRole(['OWNER', 'ADMIN', 'CASHIER', 'WAREHOUSE']), BundleController.listBundles);
router.get('/:productId', authenticate, requireRole(['OWNER', 'ADMIN', 'CASHIER', 'WAREHOUSE']), BundleController.getBundleDetail);

// OWNER and ADMIN can manage bundles and price tiers
router.post(
  '/:productId',
  authenticate,
  requireRole(['OWNER', 'ADMIN']),
  validateRequest(saveBundleComponentsSchema),
  BundleController.saveBundleComponents
);
router.delete('/:productId', authenticate, requireRole(['OWNER', 'ADMIN']), BundleController.removeBundle);

// Price tiers routes
router.get('/units/:unitId/tiers', authenticate, requireRole(['OWNER', 'ADMIN', 'CASHIER', 'WAREHOUSE']), BundleController.getUnitTiers);
router.post(
  '/units/:unitId/tiers',
  authenticate,
  requireRole(['OWNER', 'ADMIN']),
  validateRequest(saveUnitTiersSchema),
  BundleController.saveUnitTiers
);

export default router;
