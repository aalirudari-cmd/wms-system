import { z } from 'zod';

export const createSalesOrderSchema = z.object({
  orderNumber: z.string().min(1).max(60),
  customerId: z.number().int().positive(),
  requestedDate: z.coerce.date().optional(),
  lines: z.array(z.object({ productId: z.number().int().positive(), quantityOrdered: z.number().positive() })).min(1),
});

export const createPickingListSchema = z.object({
  type: z.enum(['SINGLE', 'MULTI', 'WAVE']).default('SINGLE'),
  salesOrderIds: z.array(z.number().int().positive()).min(1),
});

export const confirmPickLineSchema = z.object({
  quantityPicked: z.number().nonnegative(),
  exceptionType: z.enum(['SHORT_PICK', 'WRONG_ITEM', 'WRONG_QUANTITY', 'DAMAGED_GOODS']).optional(),
});

export const pickingListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(25),
  status: z.enum(['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
});
