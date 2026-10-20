import { Router } from 'express';
import { BundleController } from '../controllers/bundleController';
import { authenticate, requireRole } from '../middlewares/authMiddleware';

const router = Router();

// Everyone with POS access can list bundles
router.get('/', authenticate, requireRole(['OWNER', 'ADMIN', 'CASHIER', 'WAREHOUSE']), BundleController.listBundles);
router.get('/:productId', authenticate, requireRole(['OWNER', 'ADMIN', 'CASHIER', 'WAREHOUSE']), BundleController.getBundleDetail);

// OWNER and ADMIN can manage bundles and price tiers
router.post('/:productId', authenticate, requireRole(['OWNER', 'ADMIN']), BundleController.saveBundleComponents);
router.delete('/:productId', authenticate, requireRole(['OWNER', 'ADMIN']), BundleController.removeBundle);

// Price tiers routes
router.get('/units/:unitId/tiers', authenticate, requireRole(['OWNER', 'ADMIN', 'CASHIER', 'WAREHOUSE']), BundleController.getUnitTiers);
router.post('/units/:unitId/tiers', authenticate, requireRole(['OWNER', 'ADMIN']), BundleController.saveUnitTiers);

export default router;
