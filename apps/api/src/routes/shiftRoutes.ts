import { Router } from 'express';
import { ShiftController } from '../controllers/shiftController';
import { authenticate, requireRole } from '../middlewares/authMiddleware';
import { validateRequest } from '../middlewares/validate';
import { startShiftSchema, closeShiftSchema } from '../validations/shiftValidation';

const router = Router();

router.use(authenticate);

// Kasir & Admin & Owner dapat mengelola shift aktif mereka
router.post('/start', validateRequest(startShiftSchema), ShiftController.startShift);
router.get('/current', ShiftController.getCurrentShift);
router.post('/close', validateRequest(closeShiftSchema), ShiftController.closeShift);

// Owner & Admin dapat melihat riwayat seluruh shift
router.get('/', requireRole(['OWNER', 'ADMIN']), ShiftController.getAllShifts);

export default router;
