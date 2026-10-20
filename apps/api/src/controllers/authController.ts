import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';

export class AuthController {
  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, user } = await AuthService.login(req.body);

      // Set secure HTTP-only cookie
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      return sendSuccess(res, { user, token }, 'Login berhasil.');
    } catch (error) {
      next(error);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      });
      return sendSuccess(res, null, 'Logout berhasil.');
    } catch (error) {
      next(error);
    }
  }

  static async me(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const user = await AuthService.getProfile(req.user!.userId);
      return sendSuccess(res, user, 'Data profil berhasil diambil.');
    } catch (error) {
      next(error);
    }
  }

  static async createUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const user = await AuthService.createUser(req.body);
      return sendSuccess(res, user, 'Pengguna baru berhasil didaftarkan.', 201);
    } catch (error) {
      next(error);
    }
  }
}
