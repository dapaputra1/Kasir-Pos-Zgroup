import { Request, Response, NextFunction } from 'express';
import { PromotionService } from '../services/promotionService';
import { sendSuccess } from '../utils/response';

export class PromotionController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { search, isActive, page, limit } = req.query;
      const data = await PromotionService.listPromotions({
        search: search as string,
        isActive: isActive !== undefined ? isActive === 'true' : undefined,
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
      });
      return sendSuccess(res, data, 'Daftar promosi berhasil diambil.');
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const data = await PromotionService.getPromotionById(id);
      return sendSuccess(res, data, 'Detail promosi berhasil diambil.');
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await PromotionService.createPromotion(req.body);
      return sendSuccess(res, data, 'Kupon promosi baru berhasil dibuat.', 201);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const data = await PromotionService.updatePromotion(id, req.body);
      return sendSuccess(res, data, 'Promosi berhasil diperbarui.');
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      await PromotionService.deletePromotion(id);
      return sendSuccess(res, null, 'Promosi berhasil dihapus.');
    } catch (error) {
      next(error);
    }
  }

  static async validateCoupon(req: Request, res: Response, next: NextFunction) {
    try {
      const { code, subtotal } = req.body;
      const data = await PromotionService.validateCoupon(code, Number(subtotal));
      return sendSuccess(res, data, 'Kupon promosi valid dan berhasil diterapkan.');
    } catch (error) {
      next(error);
    }
  }
}
