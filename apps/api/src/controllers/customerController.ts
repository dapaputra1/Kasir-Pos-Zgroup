import { Request, Response, NextFunction } from 'express';
import { CustomerService } from '../services/customerService';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';

export class CustomerController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await CustomerService.listCustomers(req.query as any);
      return sendSuccess(res, result.data, 'Daftar pelanggan berhasil diambil.', 200, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const customer = await CustomerService.getCustomerById(id);
      return sendSuccess(res, customer, 'Detail pelanggan berhasil diambil.');
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const customer = await CustomerService.createCustomer(req.body);
      return sendSuccess(res, customer, 'Pelanggan baru berhasil ditambahkan.', 201);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const customer = await CustomerService.updateCustomer(id, req.body);
      return sendSuccess(res, customer, 'Data pelanggan berhasil diperbarui.');
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      await CustomerService.deleteCustomer(id);
      return sendSuccess(res, null, 'Pelanggan berhasil dinonaktifkan / dihapus.');
    } catch (error) {
      next(error);
    }
  }

  static async listReceivables(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await CustomerService.listReceivables(req.query as any);
      return sendSuccess(res, result.data, 'Daftar piutang tempo berhasil diambil.', 200, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  static async getReceivablesSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const summary = await CustomerService.getReceivablesSummary();
      return sendSuccess(res, summary, 'Ringkasan piutang berhasil diambil.');
    } catch (error) {
      next(error);
    }
  }

  static async recordOrderPayment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orderId = parseInt(req.params.id, 10);
      const userId = req.user!.userId;
      const result = await CustomerService.recordOrderPayment(orderId, req.body, userId);
      return sendSuccess(res, result, 'Pembayaran piutang bon berhasil dicatat.');
    } catch (error) {
      next(error);
    }
  }
}
