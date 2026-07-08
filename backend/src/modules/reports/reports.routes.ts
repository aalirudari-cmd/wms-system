import { Router } from 'express';
import { ah } from '../../core/asyncHandler.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { prisma } from '../../lib/prisma.js';
import { toCsv } from '../../core/csv.js';

export const reportsRoutes = Router();
reportsRoutes.use(requireAuth, requirePermission('reports:view'));

function sendCsv(res: import('express').Response, filename: string, csv: string) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
}

reportsRoutes.get(
  '/inventory',
  requirePermission('reports:export'),
  ah(async (_req, res) => {
    const items = await prisma.inventoryItem.findMany({ include: { product: true, location: { include: { warehouse: true } } } });
    const rows = items.map((i) => ({
      warehouse: i.location.warehouse.code,
      location: i.location.code,
      sku: i.product.sku,
      product: i.product.name,
      available: i.quantityAvailable.toString(),
      reserved: i.quantityReserved.toString(),
      blocked: i.quantityBlocked.toString(),
      damaged: i.quantityDamaged.toString(),
    }));
    sendCsv(res, 'inventory.csv', toCsv(rows, ['warehouse', 'location', 'sku', 'product', 'available', 'reserved', 'blocked', 'damaged']));
  }),
);

reportsRoutes.get(
  '/movements',
  requirePermission('reports:export'),
  ah(async (req, res) => {
    const { from, to } = req.query as { from?: string; to?: string };
    const movements = await prisma.stockMovement.findMany({
      where: from || to ? { createdAt: { gte: from ? new Date(from) : undefined, lte: to ? new Date(to) : undefined } } : undefined,
      include: { product: true, fromLocation: true, toLocation: true, user: true },
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });
    const rows = movements.map((m) => ({
      date: m.createdAt.toISOString(),
      type: m.type,
      sku: m.product.sku,
      quantity: m.quantityDelta.toString(),
      from: m.fromLocation?.code ?? '',
      to: m.toLocation?.code ?? '',
      document: m.documentType ? `${m.documentType}#${m.documentId ?? ''}` : '',
      user: m.user?.username ?? '',
      reason: m.reason ?? '',
    }));
    sendCsv(res, 'movements.csv', toCsv(rows, ['date', 'type', 'sku', 'quantity', 'from', 'to', 'document', 'user', 'reason']));
  }),
);

reportsRoutes.get(
  '/receiving',
  requirePermission('reports:export'),
  ah(async (_req, res) => {
    const receipts = await prisma.goodsReceipt.findMany({ include: { supplier: true, lines: true }, orderBy: { createdAt: 'desc' }, take: 5000 });
    const rows = receipts.map((r) => ({
      receiptNumber: r.receiptNumber,
      supplier: r.supplier?.name ?? '',
      status: r.status,
      lines: r.lines.length,
      totalExpected: r.lines.reduce((s, l) => s + Number(l.quantityExpected), 0),
      totalReceived: r.lines.reduce((s, l) => s + Number(l.quantityReceived), 0),
      totalDamaged: r.lines.reduce((s, l) => s + Number(l.quantityDamaged), 0),
      createdAt: r.createdAt.toISOString(),
    }));
    sendCsv(res, 'receiving.csv', toCsv(rows, ['receiptNumber', 'supplier', 'status', 'lines', 'totalExpected', 'totalReceived', 'totalDamaged', 'createdAt']));
  }),
);

reportsRoutes.get(
  '/operator-performance',
  requirePermission('reports:export'),
  ah(async (_req, res) => {
    const grouped = await prisma.stockMovement.groupBy({ by: ['userId', 'type'], _count: { _all: true }, where: { userId: { not: null } } });
    const userIds = [...new Set(grouped.map((g) => g.userId).filter((id): id is number => id !== null))];
    const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, username: true, fullName: true } });
    const byUser = new Map(users.map((u) => [u.id, u]));
    const rows = grouped.map((g) => ({
      user: byUser.get(g.userId!)?.fullName ?? g.userId,
      movementType: g.type,
      count: g._count._all,
    }));
    sendCsv(res, 'operator-performance.csv', toCsv(rows, ['user', 'movementType', 'count']));
  }),
);
