import { Request, Response, NextFunction } from 'express';
import { SettingService } from '../services/settingService';
import { sendSuccess } from '../utils/response';

export class SettingController {
  static async getSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const setting = await SettingService.getSettings();
      return sendSuccess(res, setting, 'Pengaturan toko berhasil diambil.');
    } catch (error) {
      next(error);
    }
  }

  static async updateSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const setting = await SettingService.updateSettings(req.body);
      return sendSuccess(res, setting, 'Pengaturan toko berhasil diperbarui.');
    } catch (error) {
      next(error);
    }
  }
}
