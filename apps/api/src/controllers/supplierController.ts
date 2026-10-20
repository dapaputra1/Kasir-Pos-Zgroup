import { Request, Response, NextFunction } from 'express';
import { SupplierService } from '../services/supplierService';
import { sendSuccess } from '../utils/response';

export class SupplierController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await SupplierService.listSuppliers(req.query as any);
      return sendSuccess(res, result.data, 'Daftar supplier berhasil diambil.', 200, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const supplier = await SupplierService.getSupplierById(id);
      return sendSuccess(res, supplier, 'Detail supplier berhasil diambil.');
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const supplier = await SupplierService.createSupplier(req.body);
      return sendSuccess(res, supplier, 'Supplier berhasil ditambahkan.', 201);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const supplier = await SupplierService.updateSupplier(id, req.body);
      return sendSuccess(res, supplier, 'Data supplier berhasil diperbarui.');
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      await SupplierService.deleteSupplier(id);
      return sendSuccess(res, null, 'Supplier berhasil dinonaktifkan / dihapus.');
    } catch (error) {
      next(error);
    }
  }
}
