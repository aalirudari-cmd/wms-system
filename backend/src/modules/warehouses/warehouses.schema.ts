import { z } from 'zod';

export const createWarehouseSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(120),
  address: z.string().max(300).optional(),
  active: z.boolean().optional(),
});

export const updateWarehouseSchema = createWarehouseSchema.partial();
