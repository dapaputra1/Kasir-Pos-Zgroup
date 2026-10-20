import { Request, Response, NextFunction } from 'express';
import { ReportService } from '../services/reportService';
import { sendSuccess } from '../utils/response';

export class ReportController {
  static async getProfitLoss(req: Request, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate } = req.query;
      const data = await ReportService.getProfitAndLoss(startDate as string, endDate as string);
      return sendSuccess(res, data, 'Laporan laba rugi berhasil diambil.');
    } catch (error) {
      next(error);
    }
  }

  static async getTopProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const { limit, startDate, endDate } = req.query;
      const parsedLimit = limit ? parseInt(limit as string, 10) : 10;
      const data = await ReportService.getTopSellingProducts(parsedLimit, startDate as string, endDate as string);
      return sendSuccess(res, data, 'Produk terlaris berhasil diambil.');
    } catch (error) {
      next(error);
    }
  }

  static async getCashflow(req: Request, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate } = req.query;
      const data = await ReportService.getCashflow(startDate as string, endDate as string);
      return sendSuccess(res, data, 'Laporan arus kas berhasil diambil.');
    } catch (error) {
      next(error);
    }
  }

  static async exportCsv(req: Request, res: Response, next: NextFunction) {
    try {
      const { type } = req.params;
      const { startDate, endDate } = req.query;

      if (!['sales', 'purchases', 'inventory'].includes(type)) {
        return res.status(400).json({ error: 'Tipe export harus sales, purchases, atau inventory' });
      }

      const csvData = await ReportService.generateCsvExport(
        type as any,
        startDate as string,
        endDate as string
      );

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=grosirpos-${type}-${new Date().toISOString().slice(0, 10)}.csv`);
      return res.status(200).send(csvData);
    } catch (error) {
      next(error);
    }
  }
}
