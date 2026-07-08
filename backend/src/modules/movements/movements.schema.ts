import { z } from 'zod';

export const movementQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(25),
  productId: z.coerce.number().int().positive().optional(),
  locationId: z.coerce.number().int().positive().optional(),
  type: z.string().optional(),
  documentType: z.string().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});
