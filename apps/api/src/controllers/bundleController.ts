import { Request, Response, NextFunction } from 'express';
import { BundleService } from '../services/bundleService';
import { PriceTierService } from '../services/priceTierService';
import { sendSuccess } from '../utils/response';

export class BundleController {
  // Bundle list
  static async listBundles(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await BundleService.listBundles();
      return sendSuccess(res, data, 'Daftar paket bundling berhasil diambil.');
    } catch (error) {
      next(error);
    }
  }

  // Get bundle detail
  static async getBundleDetail(req: Request, res: Response, next: NextFunction) {
    try {
      const productId = parseInt(req.params.productId, 10);
      const data = await BundleService.getBundleDetail(productId);
      return sendSuccess(res, data, 'Detail paket bundling berhasil diambil.');
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
