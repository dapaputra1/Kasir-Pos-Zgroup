import { Request, Response, NextFunction } from 'express';
import { ReturnService } from '../services/returnService';
import { sendSuccess } from '../utils/response';

export class ReturnController {
  static async createSaleReturn(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const result = await ReturnService.createSaleReturn(userId, req.body);
      return sendSuccess(res, result, 'Retur penjualan berhasil diproses.', 201);
    } catch (error) {
      next(error);
    }
  }

  static async getSaleReturns(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit, startDate, endDate, search } = req.query;
      const result = await ReturnService.getSaleReturns({
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
        startDate: startDate as string,
        endDate: endDate as string,
        search: search as string,
      });
      return sendSuccess(res, result, 'Daftar retur penjualan berhasil diambil.');
    } catch (error) {
      next(error);
    }
  }

  static async createPurchaseReturn(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const result = await ReturnService.createPurchaseReturn(userId, req.body);
      return sendSuccess(res, result, 'Retur pembelian ke supplier berhasil diproses.', 201);
    } catch (error) {
      next(error);
    }
  }

  static async getPurchaseReturns(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit, startDate, endDate, search } = req.query;
      const result = await ReturnService.getPurchaseReturns({
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
        startDate: startDate as string,
        endDate: endDate as string,
        search: search as string,
      });
      return sendSuccess(res, result, 'Daftar retur pembelian berhasil diambil.');
    } catch (error) {
      next(error);
    }
  }
}
