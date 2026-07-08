import { z } from 'zod';

export const inventoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(25),
  productId: z.coerce.number().int().positive().optional(),
  locationId: z.coerce.number().int().positive().optional(),
  warehouseId: z.coerce.number().int().positive().optional(),
  belowReorderPoint: z.coerce.boolean().optional(),
});

export const adjustInventorySchema = z.object({
  productId: z.number().int().positive(),
  locationId: z.number().int().positive(),
  batchId: z.number().int().positive().optional(),
  serialId: z.number().int().positive().optional(),
  bucket: z.enum(['available', 'reserved', 'blocked', 'damaged']).default('available'),
  quantityDelta: z.number().refine((v) => v !== 0, 'quantityDelta must not be zero'),
  reason: z.string().min(1).max(300),
});
