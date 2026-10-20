import { Request, Response, NextFunction } from 'express';
import { PosService } from '../services/posService';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';

export class PosController {
  static async scanBarcode(req: Request, res: Response, next: NextFunction) {
    try {
      const code = req.params.code;
      const result = await PosService.scanBarcode(code);
      return sendSuccess(res, result, 'Barang berhasil di-scan.');
    } catch (error) {
      next(error);
    }
  }

  static async searchCatalog(req: Request, res: Response, next: NextFunction) {
    try {
      const { search, categoryId } = req.query;
      const catId = categoryId ? parseInt(categoryId as string, 10) : undefined;
      const products = await PosService.searchPosProducts(search as string, catId);
      return sendSuccess(res, products, 'Katalog POS berhasil diambil.');
    } catch (error) {
      next(error);
    }
  }

  static async checkout(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const order = await PosService.checkout(req.body, userId);
      return sendSuccess(res, order, 'Transaksi penjualan berhasil diproses.', 201);
    } catch (error) {
      next(error);
    }
  }

  static async getOrderById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const order = await PosService.getOrderById(id);
      return sendSuccess(res, order, 'Detail faktur penjualan berhasil diambil.');
    } catch (error) {
      next(error);
    }
  }

  static async listOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await PosService.listOrders(req.query as any);
      return sendSuccess(
        res,
        result.items,
        'Riwayat penjualan berhasil diambil.',
        200,
        {
          ...result.pagination,
          summary: result.summary,
        }
      );
    } catch (error) {
      next(error);
    }
  }
}
