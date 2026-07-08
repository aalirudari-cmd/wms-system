import { prisma } from '../../lib/prisma.js';
import { BadRequestError, NotFoundError } from '../../core/errors.js';
import { applyMovement } from '../inventory/ledger.service.js';
import type { z } from 'zod';
import type { createSalesOrderSchema, createPickingListSchema } from './picking.schema.js';

const listInclude = {
  wave: true,
  salesOrder: { include: { customer: true } },
  assignedTo: { select: { id: true, username: true, fullName: true } },
  lines: { include: { product: true, location: true, pallet: true } },
};

export const pickingService = {
  createSalesOrder(input: z.infer<typeof createSalesOrderSchema>) {
    return prisma.salesOrder.create({
      data: {
        orderNumber: input.orderNumber,
        customerId: input.customerId,
        requestedDate: input.requestedDate,
        lines: { create: input.lines },
      },
      include: { lines: true, customer: true },
    });
  },
  listSalesOrders() {
    return prisma.salesOrder.findMany({ include: { customer: true, lines: true }, orderBy: { id: 'desc' } });
  },

  // Naive allocation: for each order line, find the location with the most
  // available stock of that product and pick the whole line from there.
  // Good enough for a single-bin-per-SKU warehouse; splitting a line across
  // multiple locations is a documented next step (see ARCHITECTURE.md roadmap).
  async createPickingList(input: z.infer<typeof createPickingListSchema>) {
    const orders = await prisma.salesOrder.findMany({ where: { id: { in: input.salesOrderIds } }, include: { lines: true } });
    if (orders.length !== input.salesOrderIds.length) throw new NotFoundError('Sales order');

    const lines: { productId: number; locationId: number; quantityToPick: number; sequence: number }[] = [];
    let sequence = 0;
    for (const order of orders) {
      for (const line of order.lines) {
        const best = await prisma.inventoryItem.findFirst({
          where: { productId: line.productId, quantityAvailable: { gt: 0 } },
          orderBy: { quantityAvailable: 'desc' },
        });
        if (!best) throw new BadRequestError(`No available stock found for product ${line.productId}.`);
        lines.push({ productId: line.productId, locationId: best.locationId, quantityToPick: Number(line.quantityOrdered), sequence: sequence++ });
      }
    }

    const pickingList = await prisma.pickingList.create({
      data: {
        type: input.type,
        salesOrderId: orders.length === 1 ? orders[0].id : undefined,
        lines: { create: lines },
      },
      include: listInclude,
    });
    await prisma.salesOrder.updateMany({ where: { id: { in: input.salesOrderIds } }, data: { status: 'ALLOCATED' } });
    return pickingList;
  },

  async list(params: { page: number; pageSize: number; status?: string }) {
    const where = params.status ? { status: params.status as any } : {};
    const [items, total] = await Promise.all([
      prisma.pickingList.findMany({ where, include: listInclude, orderBy: { createdAt: 'desc' }, skip: (params.page - 1) * params.pageSize, take: params.pageSize }),
      prisma.pickingList.count({ where }),
    ]);
    return { items, total };
  },

  async get(id: number) {
    const list = await prisma.pickingList.findUnique({ where: { id }, include: listInclude });
    if (!list) throw new NotFoundError('Picking list');
    return list;
  },

  async assign(id: number, assignedToId: number) {
    await this.get(id);
    return prisma.pickingList.update({ where: { id }, data: { assignedToId, status: 'ASSIGNED' }, include: listInclude });
  },

  async confirmLine(
    pickingListId: number,
    lineId: number,
    input: { quantityPicked: number; exceptionType?: string },
    userId: number,
  ) {
    const list = await this.get(pickingListId);
    const line = list.lines.find((l) => l.id === lineId);
    if (!line) throw new NotFoundError('Picking line');

    if (input.quantityPicked > 0) {
      await applyMovement({
        type: 'PICK',
        productId: line.productId,
        warehouseId: line.location.warehouseId,
        fromLocationId: line.locationId,
        quantity: input.quantityPicked,
        documentType: 'PickingList',
        documentId: list.id,
        reason: `Pick list #${list.id}`,
        userId,
      });
    }

    const status = input.exceptionType
      ? 'EXCEPTION'
      : input.quantityPicked >= Number(line.quantityToPick)
        ? 'PICKED'
        : 'SHORT';

    await prisma.pickingListLine.update({
      where: { id: lineId },
      data: { quantityPicked: input.quantityPicked, status, exceptionType: input.exceptionType as any },
    });

    const refreshed = await this.get(pickingListId);
    const allDone = refreshed.lines.every((l) => l.status !== 'PENDING');
    if (allDone) {
      await prisma.pickingList.update({ where: { id: pickingListId }, data: { status: 'COMPLETED', completedAt: new Date() } });
      if (refreshed.salesOrderId) {
        await prisma.salesOrder.update({ where: { id: refreshed.salesOrderId }, data: { status: 'PICKED' } });
      }
    } else if (refreshed.status === 'ASSIGNED') {
      await prisma.pickingList.update({ where: { id: pickingListId }, data: { status: 'IN_PROGRESS' } });
    }
    return this.get(pickingListId);
  },
};
