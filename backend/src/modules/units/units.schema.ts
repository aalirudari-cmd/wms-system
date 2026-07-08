import { z } from 'zod';

export const createUnitSchema = z.object({
  code: z.string().min(1).max(10),
  name: z.string().min(1).max(60),
});

export const updateUnitSchema = createUnitSchema.partial();
