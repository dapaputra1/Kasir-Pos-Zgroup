import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { authenticate, requireRole } from '../middlewares/authMiddleware';
import { validateRequest, validateQuery } from '../middlewares/validate';
import {
  createUserSchema,
  updateUserSchema,
  changePasswordSchema,
  userQuerySchema,
} from '../validations/userValidation';

const router = Router();

// Only OWNER can access and manage users
router.use(authenticate, requireRole(['OWNER']));

router.get('/', validateQuery(userQuerySchema), UserController.list);
router.get('/:id', UserController.getById);
router.post('/', validateRequest(createUserSchema), UserController.create);
router.put('/:id', validateRequest(updateUserSchema), UserController.update);
router.patch('/:id/password', validateRequest(changePasswordSchema), UserController.changePassword);

export default router;
