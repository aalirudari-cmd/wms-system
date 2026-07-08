import { prisma } from '../../lib/prisma.js';
import { BadRequestError, NotFoundError } from '../../core/errors.js';
import { applyMovement } from '../inventory/ledger.service.js';
import type { z } from 'zod';
import type { createTransferSchema } from './transfers.schema.js';

const include = {
  requestedBy: { select: { id: true, username: true, fullName: true } },
  approvedBy: { select: { id: true, username: true, fullName: true } },
  lines: { include: { product: true, fromLocation: true, toLocation: true, pallet: true } },
};

export const transfersService = {
  async list(params: { page: number; pageSize: number; status?: string }) {
    const where = params.status ? { status: params.status as any } : {};
    const [items, total] = await Promise.all([
      prisma.transfer.findMany({ where, include, orderBy: { createdAt: 'desc' }, skip: (params.page - 1) * params.pageSize, take: params.pageSize }),
      prisma.transfer.count({ where }),
    ]);
    return { items, total };
  },

  async get(id: number) {
    const transfer = await prisma.transfer.findUnique({ where: { id }, include });
    if (!transfer) throw new NotFoundError('Transfer');
    return transfer;
  },

  create(input: z.infer<typeof createTransferSchema>, userId: number) {
    return prisma.transfer.create({
      data: {
        transferNumber: input.transferNumber,
        requestedById: userId,
        status: 'PENDING_APPROVAL',
        lines: { create: input.lines },
      },
      include,
    });
  },

  async approve(id: number, userId: number) {
    const transfer = await this.get(id);
    if (transfer.status !== 'PENDING_APPROVAL') throw new BadRequestError('Only a pending transfer can be approved.');
    return prisma.transfer.update({ where: { id }, data: { status: 'APPROVED', approvedById: userId }, include });
  },

  // Scanning a line confirms (partially or fully) that its quantity has
  // physically moved from source to destination; the ledger call is what
  // actually mutates InventoryItem + writes the movement record.
  async confirmLine(transferId: number, lineId: number, quantityConfirmed: number, userId: number) {
    const transfer = await this.get(transferId);
    if (!['APPROVED', 'IN_PROGRESS'].includes(transfer.status)) {
      throw new BadRequestError('Transfer must be approved before lines can be confirmed.');
    }
    const line = transfer.lines.find((l) => l.id === lineId);
    if (!line) throw new NotFoundError('Transfer line');
    const remaining = Number(line.quantity) - Number(line.quantityConfirmed);
    if (quantityConfirmed > remaining) throw new BadRequestError(`Only ${remaining} remaining to confirm on this line.`);

    await applyMovement({
      type: 'TRANSFER',
      productId: line.productId,
      warehouseId: line.fromLocation.warehouseId,
      fromLocationId: line.fromLocationId,
      toLocationId: line.toLocationId,
      palletId: line.palletId ?? undefined,
      quantity: quantityConfirmed,
      documentType: 'Transfer',
      documentId: transfer.id,
      reason: `Transfer ${transfer.transferNumber}`,
      userId,
    });

    await prisma.transferLine.update({ where: { id: lineId }, data: { quantityConfirmed: { increment: quantityConfirmed } } });

    const refreshed = await this.get(transferId);
    const allDone = refreshed.lines.every((l) => Number(l.quantityConfirmed) >= Number(l.quantity));
    return prisma.transfer.update({
      where: { id: transferId },
      data: allDone ? { status: 'COMPLETED', completedAt: new Date() } : { status: 'IN_PROGRESS' },
      include,
    });
  },

  async cancel(id: number) {
    const transfer = await this.get(id);
    if (transfer.status === 'COMPLETED') throw new BadRequestError('A completed transfer cannot be cancelled.');
    return prisma.transfer.update({ where: { id }, data: { status: 'CANCELLED' }, include });
  },
};
