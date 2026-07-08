import { Router } from 'express';
import { ah } from '../../core/asyncHandler.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { prisma } from '../../lib/prisma.js';

export const dashboardRoutes = Router();
dashboardRoutes.use(requireAuth, requirePermission('dashboard:view'));

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

dashboardRoutes.get(
  '/kpis',
  ah(async (_req, res) => {
    const today = startOfToday();

    const [receiptsToday, transfersToday, picksToday, errorsToday, pendingPutAway, pendingTransferApproval, pendingPicking, locations, inventorySum] =
      await Promise.all([
        prisma.stockMovement.count({ where: { type: 'RECEIPT', createdAt: { gte: today } } }),
        prisma.stockMovement.count({ where: { type: 'TRANSFER', createdAt: { gte: today } } }),
        prisma.stockMovement.count({ where: { type: 'PICK', createdAt: { gte: today } } }),
        prisma.pickingListLine.count({ where: { status: 'EXCEPTION' } }),
        prisma.putAwayTask.count({ where: { status: 'PENDING' } }),
        prisma.transfer.count({ where: { status: 'PENDING_APPROVAL' } }),
        prisma.pickingList.count({ where: { status: { in: ['PENDING', 'ASSIGNED'] } } }),
        prisma.location.findMany({ where: { deletedAt: null, capacity: { not: null } }, select: { id: true, capacity: true } }),
        prisma.inventoryItem.aggregate({ _sum: { quantityAvailable: true } }),
      ]);

    const locationIds = locations.map((l) => l.id);
    const usage = locationIds.length
      ? await prisma.inventoryItem.groupBy({ by: ['locationId'], where: { locationId: { in: locationIds } }, _sum: { quantityAvailable: true } })
      : [];
    const totalCapacity = locations.reduce((sum, l) => sum + Number(l.capacity ?? 0), 0);
    const usedCapacity = usage.reduce((sum, u) => sum + Number(u._sum.quantityAvailable ?? 0), 0);

    res.json({
      todayReceipts: receiptsToday,
      todayTransfers: transfersToday,
      todayPicks: picksToday,
      todayErrors: errorsToday,
      pendingTasks: pendingPutAway + pendingTransferApproval + pendingPicking,
      pendingPutAway,
      pendingTransferApproval,
      pendingPicking,
      totalUnitsOnHand: Number(inventorySum._sum.quantityAvailable ?? 0),
      warehouseCapacityUsedPct: totalCapacity > 0 ? Math.round((usedCapacity / totalCapacity) * 1000) / 10 : null,
    });
  }),
);

dashboardRoutes.get(
  '/activity',
  ah(async (_req, res) => {
    const movements = await prisma.stockMovement.findMany({
      take: 25,
      orderBy: { createdAt: 'desc' },
      include: { product: true, fromLocation: true, toLocation: true, user: { select: { fullName: true } } },
    });
    res.json(movements);
  }),
);

dashboardRoutes.get(
  '/throughput',
  ah(async (_req, res) => {
    const since = new Date();
    since.setDate(since.getDate() - 6);
    since.setHours(0, 0, 0, 0);
    const movements = await prisma.stockMovement.findMany({
      where: { createdAt: { gte: since } },
      select: { type: true, createdAt: true },
    });
    const days: Record<string, { receipts: number; transfers: number; picks: number }> = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(since);
      d.setDate(d.getDate() + i);
      days[d.toISOString().slice(0, 10)] = { receipts: 0, transfers: 0, picks: 0 };
    }
    for (const m of movements) {
      const key = m.createdAt.toISOString().slice(0, 10);
      if (!days[key]) continue;
      if (m.type === 'RECEIPT') days[key].receipts++;
      else if (m.type === 'TRANSFER') days[key].transfers++;
      else if (m.type === 'PICK') days[key].picks++;
    }
    res.json(Object.entries(days).map(([date, counts]) => ({ date, ...counts })));
  }),
);
