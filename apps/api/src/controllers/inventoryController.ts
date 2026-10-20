import { Request, Response, NextFunction } from 'express';
import { InventoryService } from '../services/inventoryService';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';

export class InventoryController {
  static async listMovements(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await InventoryService.listMovements(req.query as any);
      return sendSuccess(res, result.data, 'Log mutasi inventori berhasil diambil.', 200, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  static async processOpname(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { items } = req.body;
      const result = await InventoryService.processStockOpname(items, userId);
      return sendSuccess(res, result, 'Stock opname berhasil diproses & selisih disesuaikan.');
    } catch (error) {
      next(error);
    }
  }
}
