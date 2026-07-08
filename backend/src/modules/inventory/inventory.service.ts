import { prisma } from '../../lib/prisma.js';
import { NotFoundError } from '../../core/errors.js';
import { inventoryRepository } from './inventory.repository.js';
import { applyAdjustment } from './ledger.service.js';
import type { adjustInventorySchema } from './inventory.schema.js';
import type { z } from 'zod';

export const inventoryService = {
  list: (params: Parameters<typeof inventoryRepository.findMany>[0]) => inventoryRepository.findMany(params),

  async adjust(input: z.infer<typeof adjustInventorySchema>, userId: number) {
    const location = await prisma.location.findFirst({ where: { id: input.locationId, deletedAt: null } });
    if (!location) throw new NotFoundError('Location');
    return applyAdjustment({
      productId: input.productId,
      warehouseId: location.warehouseId,
      locationId: input.locationId,
      batchId: input.batchId,
      serialId: input.serialId,
      bucket: input.bucket,
      quantityDelta: input.quantityDelta,
      reason: input.reason,
      userId,
    });
  },
};
