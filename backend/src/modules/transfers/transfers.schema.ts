import { z } from 'zod';

export const createTransferSchema = z.object({
  transferNumber: z.string().min(1).max(60),
  lines: z
    .array(
      z.object({
        productId: z.number().int().positive(),
        palletId: z.number().int().positive().optional(),
        fromLocationId: z.number().int().positive(),
        toLocationId: z.number().int().positive(),
        quantity: z.number().positive(),
      }),
    )
    .min(1),
});

export const confirmTransferLineSchema = z.object({
  quantityConfirmed: z.number().positive(),
});

export const transferQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(25),
  status: z.enum(['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
});
