import { Request, Response, NextFunction } from 'express';
import { ShiftService } from '../services/shiftService';
import { sendSuccess } from '../utils/response';

export class ShiftController {
  static async startShift(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const { startingCash, notes } = req.body;
      const shift = await ShiftService.startShift(userId, startingCash, notes);
      return sendSuccess(res, shift, 'Sesi shift kasir berhasil dibuka.', 201);
    } catch (error) {
      next(error);
    }
  }

  static async getCurrentShift(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const shift = await ShiftService.getCurrentShift(userId);
      return sendSuccess(res, shift, 'Data shift aktif kasir berhasil diambil.');
    } catch (error) {
      next(error);
    }
  }

  static async closeShift(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const { closingCash, notes } = req.body;
      const result = await ShiftService.closeShift(userId, closingCash, notes);
      return sendSuccess(res, result, 'Sesi shift kasir berhasil ditutup dan direkonsiliasi.');
    } catch (error) {
      next(error);
    }
  }

  static async getAllShifts(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit, startDate, endDate, userId } = req.query;
      const result = await ShiftService.getAllShifts({
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
        startDate: startDate as string,
        endDate: endDate as string,
        userId: userId ? parseInt(userId as string, 10) : undefined,
      });
      return sendSuccess(res, result, 'Daftar riwayat shift kasir berhasil diambil.');
    } catch (error) {
      next(error);
    }
  }
}
