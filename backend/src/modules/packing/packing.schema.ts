import { z } from 'zod';

export const createPackageSchema = z.object({
  salesOrderId: z.number().int().positive(),
  packageNumber: z.string().min(1).max(60),
  lines: z.array(z.object({ productId: z.number().int().positive(), quantity: z.number().positive() })).min(1),
});

export const closePackageSchema = z.object({
  weightKg: z.number().nonnegative().optional(),
  dimensions: z.string().max(60).optional(),
  shippingLabelUrl: z.string().url().optional(),
});
