import { z } from 'zod';

export const createCycleCountSchema = z.object({
  countNumber: z.string().min(1).max(60),
  type: z.enum(['RANDOM', 'FULL', 'CYCLE']).default('CYCLE'),
  lines: z.array(z.object({ productId: z.number().int().positive(), locationId: z.number().int().positive() })).min(1),
});

export const recordCountLineSchema = z.object({
  countedQuantity: z.number().nonnegative(),
  barcodeVerified: z.boolean().optional(),
});
