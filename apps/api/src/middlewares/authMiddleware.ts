import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../utils/jwt';
import { sendError } from '../utils/response';
import { prisma } from '../config/prisma';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    let token: string | undefined;

    // 1. Check HTTP-only cookie first (browser security)
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    // 2. Fallback to Authorization: Bearer <token> header (for API testing / mobile)
    else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return sendError(res, 'Sesi tidak valid atau telah berakhir. Silakan login kembali.', 401, 'UNAUTHORIZED');
    }

    const payload = verifyToken(token);

    // Verify user still exists and is active in database
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, name: true, role: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return sendError(res, 'Pengguna tidak ditemukan atau dinonaktifkan.', 401, 'UNAUTHORIZED');
    }

    req.user = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    next();
  } catch (error: any) {
    return sendError(res, 'Token autentikasi tidak valid atau sudah kadaluarsa.', 401, 'INVALID_TOKEN');
  }
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): any => {
    if (!req.user) {
      return sendError(res, 'Akses ditolak: Autentikasi diperlukan.', 401, 'UNAUTHORIZED');
    }

    if (!allowedRoles.includes(req.user.role)) {
      return sendError(
        res,
        `Akses ditolak: Peran '${req.user.role}' tidak memiliki izin untuk tindakan ini.`,
        403,
        'FORBIDDEN'
      );
    }

    next();
  };
};
