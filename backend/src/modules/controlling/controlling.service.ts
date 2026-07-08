import { prisma } from '../../lib/prisma.js';
import { BadRequestError, NotFoundError } from '../../core/errors.js';
import { applyAdjustment } from '../inventory/ledger.service.js';
import type { z } from 'zod';
import type { createCycleCountSchema } from './controlling.schema.js';

const include = {
  createdBy: { select: { id: true, fullName: true } },
  approvedBy: { select: { id: true, fullName: true } },
  lines: { include: { product: true, location: true } },
};

async function expectedQuantityAt(productId: number, locationId: number) {
  const item = await prisma.inventoryItem.findFirst({ where: { productId, locationId } });
  return item ? Number(item.quantityAvailable) : 0;
}

export const controllingService = {
  async create(input: z.infer<typeof createCycleCountSchema>, userId: number) {
    const lines = await Promise.all(
      input.lines.map(async (l) => ({
        productId: l.productId,
        locationId: l.locationId,
        expectedQuantity: await expectedQuantityAt(l.productId, l.locationId),
      })),
    );
    return prisma.cycleCount.create({
      data: { countNumber: input.countNumber, type: input.type, createdById: userId, status: 'IN_PROGRESS', lines: { create: lines } },
      include,
    });
  },

  list: () => prisma.cycleCount.findMany({ include, orderBy: { createdAt: 'desc' } }),

  async get(id: number) {
    const count = await prisma.cycleCount.findUnique({ where: { id }, include });
    if (!count) throw new NotFoundError('Cycle count');
    return count;
  },

  async recordLine(countId: number, lineId: number, input: { countedQuantity: number; barcodeVerified?: boolean }) {
    const count = await this.get(countId);
    if (count.status !== 'IN_PROGRESS') throw new BadRequestError('Count is not in progress.');
    if (!count.lines.some((l) => l.id === lineId)) throw new NotFoundError('Count line');
    await prisma.cycleCountLine.update({ where: { id: lineId }, data: { countedQuantity: input.countedQuantity, barcodeVerified: input.barcodeVerified ?? false } });
    return this.get(countId);
  },

  async submit(id: number) {
    const count = await this.get(id);
    if (count.lines.some((l) => l.countedQuantity === null)) throw new BadRequestError('All lines must be counted before submitting.');
    return prisma.cycleCount.update({ where: { id }, data: { status: 'PENDING_APPROVAL' }, include });
  },

  async approve(id: number, userId: number) {
    const count = await this.get(id);
    if (count.status !== 'PENDING_APPROVAL') throw new BadRequestError('Only a submitted count can be approved.');

    for (const line of count.lines) {
      const difference = Number(line.countedQuantity) - Number(line.expectedQuantity);
      if (difference === 0) continue;
      await applyAdjustment({
        productId: line.productId,
        warehouseId: line.location.warehouseId,
        locationId: line.locationId,
        bucket: 'available',
        quantityDelta: difference,
        reason: `Cycle count ${count.countNumber} correction`,
        userId,
      });
    }
    return prisma.cycleCount.update({ where: { id }, data: { status: 'APPROVED', approvedById: userId, approvedAt: new Date() }, include });
  },

  async reject(id: number, userId: number) {
    const count = await this.get(id);
    if (count.status !== 'PENDING_APPROVAL') throw new BadRequestError('Only a submitted count can be rejected.');
    return prisma.cycleCount.update({ where: { id }, data: { status: 'REJECTED', approvedById: userId, approvedAt: new Date() }, include });
  },
};
