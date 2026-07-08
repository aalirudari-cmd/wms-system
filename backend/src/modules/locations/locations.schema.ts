import { z } from 'zod';

export const locationTypeEnum = z.enum(['WAREHOUSE', 'ZONE', 'AREA', 'AISLE', 'RACK', 'SHELF', 'BIN']);
export const locationStatusEnum = z.enum(['ACTIVE', 'INACTIVE', 'BLOCKED', 'FULL']);

export const createLocationSchema = z.object({
  warehouseId: z.number().int().positive(),
  parentId: z.number().int().positive().optional().nullable(),
  code: z.string().min(1).max(60),
  name: z.string().min(1).max(120),
  type: locationTypeEnum,
  barcode: z.string().max(80).optional(),
  qrCode: z.string().max(200).optional(),
  capacity: z.number().nonnegative().optional(),
  capacityUnit: z.string().max(20).optional(),
  allowMixedSku: z.boolean().optional(),
  status: locationStatusEnum.optional(),
});

export const updateLocationSchema = createLocationSchema.partial();

export const locationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(25),
  search: z.string().trim().optional(),
  warehouseId: z.coerce.number().int().positive().optional(),
  type: locationTypeEnum.optional(),
  parentId: z.coerce.number().int().positive().optional(),
});
