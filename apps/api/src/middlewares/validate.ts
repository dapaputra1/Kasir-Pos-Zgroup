import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { sendError } from '../utils/response';

export const validateRequest = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error: any) {
      if (error instanceof ZodError) {
        const issues = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        return sendError(
          res,
          'Validasi input gagal. Mohon periksa kembali data yang dimasukkan.',
          422,
          'VALIDATION_ERROR',
          issues
        );
      }
      return sendError(res, 'Terjadi kesalahan validasi input.', 400);
    }
  };
};

export const validateQuery = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
      req.query = await schema.parseAsync(req.query);
      next();
    } catch (error: any) {
      if (error instanceof ZodError) {
        const issues = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        return sendError(res, 'Parameter query tidak valid.', 422, 'QUERY_VALIDATION_ERROR', issues);
      }
      return sendError(res, 'Query parameter tidak valid.', 400);
    }
  };
};
