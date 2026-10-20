import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/userService';
import { sendSuccess } from '../utils/response';

export class UserController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await UserService.listUsers(req.query as any);
      return sendSuccess(res, result.data, 'Daftar pengguna berhasil diambil.', 200, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const user = await UserService.getUserById(id);
      return sendSuccess(res, user, 'Detail pengguna berhasil diambil.');
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await UserService.createUser(req.body);
      return sendSuccess(res, user, 'Pengguna baru berhasil ditambahkan.', 201);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const user = await UserService.updateUser(id, req.body);
      return sendSuccess(res, user, 'Data pengguna berhasil diperbarui.');
    } catch (error) {
      next(error);
    }
  }

  static async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const { newPassword } = req.body;
      const result = await UserService.changePassword(id, newPassword);
      return sendSuccess(res, result, 'Password pengguna berhasil diubah.');
    } catch (error) {
      next(error);
    }
  }
}
