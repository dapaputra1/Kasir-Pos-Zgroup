import { Request, Response, NextFunction } from 'express';
import { BundleService } from '../services/bundleService';
import { PriceTierService } from '../services/priceTierService';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';

export class BundleController {
  // Bundle list
  static async listBundles(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await BundleService.listBundles();
      const isCashier = (req as AuthenticatedRequest).user?.role === 'CASHIER';
      const safeData = isCashier
        ? data.map((b: any) => ({
            ...b,
            purchasePrice: 0,
            totalComponentHpp: 0,
            bundleParents: b.bundleParents?.map((bp: any) => ({
              ...bp,
              componentProduct: bp.componentProduct
                ? { ...bp.componentProduct, purchasePrice: 0 }
                : bp.componentProduct,
            })),
          }))
        : data;
      return sendSuccess(res, safeData, 'Daftar paket bundling berhasil diambil.');
    } catch (error) {
      next(error);
    }
  }

  // Get bundle detail
  static async getBundleDetail(req: Request, res: Response, next: NextFunction) {
    try {
      const productId = parseInt(req.params.productId, 10);
      const data = await BundleService.getBundleDetail(productId);
      const isCashier = (req as AuthenticatedRequest).user?.role === 'CASHIER';
      const safeData =
        isCashier && data
          ? {
              ...data,
              purchasePrice: 0,
              totalComponentHpp: 0,
              bundleParents: data.bundleParents?.map((bp: any) => ({
                ...bp,
                componentProduct: bp.componentProduct
                  ? { ...bp.componentProduct, purchasePrice: 0 }
                  : bp.componentProduct,
              })),
            }
          : data;
      return sendSuccess(res, safeData, 'Detail paket bundling berhasil diambil.');
    } catch (error) {
      next(error);
    }
  }

  // Save bundle components
  static async saveBundleComponents(req: Request, res: Response, next: NextFunction) {
    try {
      const productId = parseInt(req.params.productId, 10);
      const { components } = req.body;
      const data = await BundleService.saveBundleComponents(productId, components);
      return sendSuccess(res, data, 'Komponen paket bundling berhasil disimpan.');
    } catch (error) {
      next(error);
    }
  }

  // Remove bundle status
  static async removeBundle(req: Request, res: Response, next: NextFunction) {
    try {
      const productId = parseInt(req.params.productId, 10);
      const data = await BundleService.removeBundle(productId);
      return sendSuccess(res, data, 'Status paket bundling berhasil dihapus.');
    } catch (error) {
      next(error);
    }
  }

  // Price Tiers by Unit
  static async getUnitTiers(req: Request, res: Response, next: NextFunction) {
    try {
      const unitId = parseInt(req.params.unitId, 10);
      const data = await PriceTierService.getTiersByUnit(unitId);
      return sendSuccess(res, data, 'Daftar tier harga berhasil diambil.');
    } catch (error) {
      next(error);
    }
  }

  // Save Price Tiers
  static async saveUnitTiers(req: Request, res: Response, next: NextFunction) {
    try {
      const unitId = parseInt(req.params.unitId, 10);
      const { tiers } = req.body;
      const data = await PriceTierService.saveTiers(unitId, tiers);
      return sendSuccess(res, data, 'Daftar tier harga berhasil disimpan.');
    } catch (error) {
      next(error);
    }
  }
}
