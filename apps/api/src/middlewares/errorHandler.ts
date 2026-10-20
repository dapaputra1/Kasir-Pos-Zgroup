import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response';
import { Prisma } from '@prisma/client';

export class ApiError extends Error {
  statusCode: number;
  code?: string;
  details?: any;

  constructor(statusCode: number, message: string, code?: string, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): any => {
  console.error('[Error Details]:', err);

  // Prisma unique constraint violation (e.g. unique SKU, Barcode, Email)
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = (err.meta?.target as string[]) || [];
      const fields = Array.isArray(target) ? target.join(', ') : 'field';
      return sendError(
        res,
        `Data dengan ${fields} tersebut sudah terdaftar di sistem.`,
        409,
        'DUPLICATE_ENTRY',
        { fields }
      );
    }

    if (err.code === 'P2003') {
      return sendError(
        res,
        'Operasi gagal karena data ini masih digunakan atau berelasi dengan data lain.',
        409,
        'FOREIGN_KEY_VIOLATION'
      );
    }

    if (err.code === 'P2025') {
      return sendError(res, 'Data yang diminta tidak ditemukan.', 404, 'NOT_FOUND');
    }
  }

  // Handle generic errors
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Terjadi kesalahan pada server.';
  return sendError(res, message, statusCode, err.code || 'INTERNAL_SERVER_ERROR');
};
