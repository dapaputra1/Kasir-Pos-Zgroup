import { Router } from 'express';
import { DashboardController } from '../controllers/dashboardController';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();

router.get('/summary', authenticate, DashboardController.getSummary);

export default router;
