import { Router } from 'express';
import { InventoryController } from '../controllers/inventoryController';
import { authenticate, requireRole } from '../middlewares/authMiddleware';

const router = Router();

// Owner, Admin, and Warehouse can view and process inventory
router.use(authenticate, requireRole(['OWNER', 'ADMIN', 'WAREHOUSE']));

router.get('/movements', InventoryController.listMovements);
router.post('/opname', InventoryController.processOpname);

export default router;
