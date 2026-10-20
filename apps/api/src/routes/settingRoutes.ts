import { Router } from 'express';
import { SettingController } from '../controllers/settingController';
import { authenticate, requireRole } from '../middlewares/authMiddleware';
import { validateRequest } from '../middlewares/validate';
import { updateStoreSettingSchema } from '../validations/settingValidation';

const router = Router();

router.use(authenticate);

// Semua pengguna terautentikasi dapat melihat pengaturan toko untuk keperluan struk POS
router.get('/', SettingController.getSettings);

// Hanya OWNER yang dapat mengubah data dan pengaturan toko
router.put('/', requireRole(['OWNER']), validateRequest(updateStoreSettingSchema), SettingController.updateSettings);

export default router;
