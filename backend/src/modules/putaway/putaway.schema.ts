import { z } from 'zod';

export const confirmPutAwaySchema = z.object({
  actualLocationId: z.number().int().positive(),
  palletId: z.number().int().positive().optional(),
});

export const putAwayQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(25),
  status: z.enum(['PENDING', 'CONFIRMED', 'EXCEPTION']).optional(),
});
