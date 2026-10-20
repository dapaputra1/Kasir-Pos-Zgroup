import { Router } from 'express';
import { ReportController } from '../controllers/reportController';
import { authenticate, requireRole } from '../middlewares/authMiddleware';

const router = Router();

// Only OWNER and ADMIN can view financial reports and export
router.use(authenticate, requireRole(['OWNER', 'ADMIN']));

router.get('/profit-loss', ReportController.getProfitLoss);
router.get('/top-products', ReportController.getTopProducts);
router.get('/cashflow', ReportController.getCashflow);
router.get('/export/:type', ReportController.exportCsv);

export default router;
