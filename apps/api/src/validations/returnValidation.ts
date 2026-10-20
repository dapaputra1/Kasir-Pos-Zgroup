import { z } from 'zod';

export const createSaleReturnSchema = z.object({
  orderId: z.number({ required_error: 'ID Faktur Penjualan harus disertakan' }),
  reason: z.string().trim().min(3, 'Alasan retur minimal 3 karakter'),
  refundMethod: z.enum(['CASH', 'CREDIT_OFFSET', 'NO_REFUND']).default('CASH'),
  items: z
    .array(
      z.object({
        productId: z.number({ required_error: 'ID Produk harus disertakan' }),
        unitName: z.string().trim().min(1, 'Nama satuan harus disertakan'),
        quantity: z.number().positive('Jumlah retur harus lebih besar dari 0'),
        returnToStock: z.boolean().default(true),
      })
    )
    .min(1, 'Minimal satu barang harus disertakan untuk retur'),
});

export const createPurchaseReturnSchema = z.object({
  purchaseId: z.number({ required_error: 'ID Pembelian harus disertakan' }),
  reason: z.string().trim().min(3, 'Alasan retur minimal 3 karakter'),
  refundMethod: z.enum(['CASH', 'DEBT_OFFSET']).default('DEBT_OFFSET'),
  items: z
    .array(
      z.object({
        productId: z.number({ required_error: 'ID Produk harus disertakan' }),
        unitName: z.string().trim().min(1, 'Nama satuan harus disertakan'),
        quantity: z.number().positive('Jumlah retur harus lebih besar dari 0'),
      })
    )
    .min(1, 'Minimal satu barang harus disertakan untuk retur'),
});
