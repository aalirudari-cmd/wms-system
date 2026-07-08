import { z } from 'zod';

export const createProductSchema = z.object({
  sku: z.string().min(1).max(60),
  barcode: z.string().max(80).optional(),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  categoryId: z.number().int().positive().optional().nullable(),
  brandId: z.number().int().positive().optional().nullable(),
  unitId: z.number().int().positive(),
  reorderPoint: z.number().int().nonnegative().optional(),
  weightKg: z.number().nonnegative().optional(),
  trackBatch: z.boolean().optional(),
  trackSerial: z.boolean().optional(),
  trackExpiry: z.boolean().optional(),
  active: z.boolean().optional(),
});

export const updateProductSchema = createProductSchema.partial();

export const productQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(25),
  search: z.string().trim().optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  brandId: z.coerce.number().int().positive().optional(),
});
