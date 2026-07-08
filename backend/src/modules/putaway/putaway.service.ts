import { prisma } from '../../lib/prisma.js';
import { ConflictError, NotFoundError, BadRequestError } from '../../core/errors.js';
import { applyMovement } from '../inventory/ledger.service.js';

const include = {
  product: true,
  suggestedLocation: true,
  actualLocation: true,
  pallet: true,
  goodsReceipt: { select: { id: true, receiptNumber: true } },
};

export const putAwayService = {
  async list(params: { page: number; pageSize: number; status?: string }) {
    const where = params.status ? { status: params.status as any } : {};
    const [items, total] = await Promise.all([
      prisma.putAwayTask.findMany({
        where,
        include,
        orderBy: { createdAt: 'asc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      prisma.putAwayTask.count({ where }),
    ]);
    return { items, total };
  },

  async confirm(taskId: number, input: { actualLocationId: number; palletId?: number }, userId: number) {
    const task = await prisma.putAwayTask.findUnique({
      where: { id: taskId },
      include: { goodsReceipt: { include: { lines: true } } },
    });
    if (!task) throw new NotFoundError('Put-away task');
    if (task.status !== 'PENDING') throw new BadRequestError('This task has already been actioned.');

    const targetLocation = await prisma.location.findFirst({ where: { id: input.actualLocationId, deletedAt: null } });
    if (!targetLocation) throw new NotFoundError('Location');

    if (targetLocation.capacity) {
      const existing = await prisma.inventoryItem.aggregate({
        where: { locationId: targetLocation.id },
        _sum: { quantityAvailable: true },
      });
      const projected = Number(existing._sum.quantityAvailable ?? 0) + Number(task.quantity);
      if (projected > Number(targetLocation.capacity)) {
        throw new ConflictError(`Location ${targetLocation.code} capacity exceeded (${projected}/${targetLocation.capacity}).`);
      }
    }

    if (!targetLocation.allowMixedSku) {
      const others = await prisma.inventoryItem.findMany({ where: { locationId: targetLocation.id, quantityAvailable: { gt: 0 } } });
      if (others.some((o) => o.productId !== task.productId)) {
        throw new ConflictError(`Location ${targetLocation.code} does not allow mixed SKUs.`);
      }
    }

    // Stock was placed at the receiving line's staging location when the
    // receipt was completed; put-away is the move from there to the bin.
    const sourceLine = task.goodsReceipt.lines.find((l) => l.productId === task.productId && l.locationId);

    await applyMovement({
      type: 'PUTAWAY',
      productId: task.productId,
      warehouseId: targetLocation.warehouseId,
      fromLocationId: sourceLine?.locationId ?? undefined,
      toLocationId: targetLocation.id,
      palletId: input.palletId,
      quantity: Number(task.quantity),
      documentType: 'PutAwayTask',
      documentId: task.id,
      reason: 'Put-away confirmed',
      userId,
    });

    return prisma.putAwayTask.update({
      where: { id: taskId },
      data: { actualLocationId: targetLocation.id, palletId: input.palletId, status: 'CONFIRMED', confirmedById: userId, confirmedAt: new Date() },
      include,
    });
  },
};
