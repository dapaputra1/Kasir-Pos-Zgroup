import { Request, Response, NextFunction } from 'express';
import { PurchaseService } from '../services/purchaseService';
import { AiReceiptService } from '../services/aiReceiptService';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';

export class PurchaseController {
  static async scanReceipt(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { images, imageBase64, mimeType, geminiApiKey } = req.body;
      const inputImages = images || imageBase64;
      if (!inputImages || (Array.isArray(inputImages) && inputImages.length === 0)) {
        const error: any = new Error('Foto nota tidak ditemukan. Pastikan Anda mengunggah atau memotret setidaknya satu lembar nota.');
        error.statusCode = 400;
        throw error;
      }

      const result = await AiReceiptService.scanReceipt(inputImages, mimeType || 'image/jpeg', geminiApiKey);
      const pageCount = Array.isArray(inputImages) ? inputImages.length : 1;
      return sendSuccess(res, result, `Nota (${pageCount} lembar) berhasil dianalisis dengan AI.`);
    } catch (error) {
      next(error);
    }
  }

  static async smartImport(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const purchase = await PurchaseService.smartImport(req.body, userId);
      return sendSuccess(res, purchase, 'Faktur nota pembelian & stok barang berhasil diimpor.', 201);
    } catch (error) {
      next(error);
    }
  }

  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const purchase = await PurchaseService.createPurchase(req.body, userId);
      return sendSuccess(res, purchase, 'Faktur pembelian & restock barang berhasil dicatat.', 201);
    } catch (error) {
      next(error);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await PurchaseService.listPurchases(req.query as any);
      return sendSuccess(res, result.data, 'Daftar pembelian berhasil diambil.', 200, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const purchase = await PurchaseService.getPurchaseById(id);
      return sendSuccess(res, purchase, 'Detail faktur pembelian berhasil diambil.');
    } catch (error) {
      next(error);
    }
  }

  static async recordPayment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const userId = req.user!.userId;
      const result = await PurchaseService.recordPayment(id, req.body, userId);
      return sendSuccess(res, result, 'Pembayaran hutang pembelian berhasil dicatat.');
    } catch (error) {
      next(error);
    }
  }

  static async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const summary = await PurchaseService.getPurchaseSummary();
      return sendSuccess(res, summary, 'Ringkasan pembelian & hutang berhasil diambil.');
    } catch (error) {
      next(error);
    }
  }
}
