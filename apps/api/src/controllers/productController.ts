import { Request, Response, NextFunction } from 'express';
import { ProductService } from '../services/productService';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';

export class ProductController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ProductService.listProducts(req.query as any);
      const isCashier = (req as AuthenticatedRequest).user?.role === 'CASHIER';
      const items = isCashier
        ? result.items.map((p: any) => ({ ...p, purchasePrice: 0 }))
        : result.items;
      return sendSuccess(res, items, 'Daftar produk berhasil diambil.', 200, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const product = await ProductService.getProductById(id);
      const isCashier = (req as AuthenticatedRequest).user?.role === 'CASHIER';
      const safeProduct = isCashier && product ? { ...product, purchasePrice: 0 } : product;
      return sendSuccess(res, safeProduct, 'Detail produk berhasil diambil.');
    } catch (error) {
      next(error);
    }
  }

  static async getByBarcode(req: Request, res: Response, next: NextFunction) {
    try {
      const code = req.params.code;
      const product = await ProductService.getProductByBarcodeOrSku(code);
      const isCashier = (req as AuthenticatedRequest).user?.role === 'CASHIER';
      const safeProduct = isCashier && product ? { ...product, purchasePrice: 0 } : product;
      return sendSuccess(res, safeProduct, 'Produk ditemukan.');
    } catch (error) {
      next(error);
    }
  }

  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const product = await ProductService.createProduct(req.body, req.user?.userId);
      return sendSuccess(res, product, 'Produk berhasil ditambahkan.', 201);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const product = await ProductService.updateProduct(id, req.body);
      return sendSuccess(res, product, 'Produk berhasil diperbarui.');
    } catch (error) {
      next(error);
    }
  }

  static async adjustStock(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const result = await ProductService.adjustStock(id, req.body, req.user?.userId);
      return sendSuccess(res, result, 'Penyesuaian stok berhasil dicatat.');
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      await ProductService.deleteProduct(id);
      return sendSuccess(res, null, 'Produk berhasil dihapus/dinonaktifkan.');
    } catch (error) {
      next(error);
    }
  }
}
