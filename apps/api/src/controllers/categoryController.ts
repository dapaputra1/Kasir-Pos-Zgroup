import { Request, Response, NextFunction } from 'express';
import { CategoryService } from '../services/categoryService';
import { sendSuccess } from '../utils/response';

export class CategoryController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const onlyActive = req.query.active === 'true';
      const categories = await CategoryService.listCategories(onlyActive);
      return sendSuccess(res, categories, 'Daftar kategori berhasil diambil.');
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const category = await CategoryService.getCategoryById(id);
      return sendSuccess(res, category, 'Detail kategori berhasil diambil.');
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const category = await CategoryService.createCategory(req.body);
      return sendSuccess(res, category, 'Kategori berhasil ditambahkan.', 201);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      const category = await CategoryService.updateCategory(id, req.body);
      return sendSuccess(res, category, 'Kategori berhasil diperbarui.');
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id, 10);
      await CategoryService.deleteCategory(id);
      return sendSuccess(res, null, 'Kategori berhasil dihapus.');
    } catch (error) {
      next(error);
    }
  }
}
