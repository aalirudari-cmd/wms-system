import { z } from 'zod';

export const createBrandSchema = z.object({
  name: z.string().min(1).max(120),
});

export const updateBrandSchema = createBrandSchema.partial();
