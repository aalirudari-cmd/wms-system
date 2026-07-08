import { z } from 'zod';

export const createPurchaseOrderSchema = z.object({
  poNumber: z.string().min(1).max(60),
  supplierId: z.number().int().positive(),
  expectedDate: z.coerce.date().optional(),
  notes: z.string().max(1000).optional(),
  lines: z
    .array(z.object({ productId: z.number().int().positive(), quantityOrdered: z.number().positive() }))
    .min(1),
});

export const createAsnSchema = z.object({
  asnNumber: z.string().min(1).max(60),
  supplierId: z.number().int().positive(),
  purchaseOrderId: z.number().int().positive().optional(),
  expectedDate: z.coerce.date().optional(),
  lines: z.array(z.object({ productId: z.number().int().positive(), quantity: z.number().positive() })).min(1),
});

export const createGoodsReceiptSchema = z.object({
  receiptNumber: z.string().min(1).max(60),
  purchaseOrderId: z.number().int().positive().optional(),
  asnId: z.number().int().positive().optional(),
  supplierId: z.number().int().positive().optional(),
  notes: z.string().max(1000).optional(),
  lines: z
    .array(
      z.object({
        productId: z.number().int().positive(),
        quantityExpected: z.number().nonnegative().default(0),
      }),
    )
    .min(1),
});

export const updateReceiptLineSchema = z.object({
  locationId: z.number().int().positive().optional(),
  batchNumber: z.string().max(60).optional(),
  serialNumbers: z.array(z.string().max(80)).optional(),
  manufactureDate: z.coerce.date().optional(),
  expiryDate: z.coerce.date().optional(),
  quantityReceived: z.number().nonnegative().optional(),
  quantityDamaged: z.number().nonnegative().optional(),
  quantityMissing: z.number().nonnegative().optional(),
  comments: z.string().max(1000).optional(),
  photoUrls: z.array(z.string().url()).optional(),
});

export const receiptQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(25),
  status: z.enum(['WAITING', 'RECEIVING', 'RECEIVED', 'COMPLETED', 'REJECTED']).optional(),
  search: z.string().trim().optional(),
});
