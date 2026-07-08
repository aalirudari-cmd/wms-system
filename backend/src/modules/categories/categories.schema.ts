import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().min(1).max(120),
  parentId: z.number().int().positive().optional().nullable(),
});

export const updateCategorySchema = createCategorySchema.partial();
