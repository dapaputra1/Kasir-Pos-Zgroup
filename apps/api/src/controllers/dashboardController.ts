import { Request, Response, NextFunction } from 'express';
import { DashboardService } from '../services/dashboardService';
import { sendSuccess } from '../utils/response';

export class DashboardController {
  static async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const summary = await DashboardService.getSummary();
      return sendSuccess(res, summary, 'Ringkasan dashboard berhasil diambil.');
    } catch (error) {
      next(error);
    }
  }
}
