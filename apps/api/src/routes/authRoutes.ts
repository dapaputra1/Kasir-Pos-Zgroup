import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { validateRequest } from '../middlewares/validate';
import { loginSchema, createUserSchema } from '../validations/authValidation';
import { authenticate, requireRole } from '../middlewares/authMiddleware';

const router = Router();

router.post('/login', validateRequest(loginSchema), AuthController.login);
router.post('/logout', AuthController.logout);
router.get('/me', authenticate, AuthController.me);

// User management by OWNER / ADMIN
router.post(
  '/users',
  authenticate,
  requireRole(['OWNER', 'ADMIN']),
  validateRequest(createUserSchema),
  AuthController.createUser
);

export default router;
