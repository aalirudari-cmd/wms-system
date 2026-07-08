import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import { ah } from '../../core/asyncHandler.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { prisma } from '../../lib/prisma.js';
import { movementQuerySchema } from './movements.schema.js';

export const movementsRoutes = Router();

movementsRoutes.use(requireAuth, requirePermission('movements:view'));

movementsRoutes.get(
  '/',
  validate(movementQuerySchema, 'query'),
  ah(async (req, res) => {
    const q = req.query as any;
    const where: Prisma.StockMovementWhereInput = {
      ...(q.productId ? { productId: q.productId } : {}),
      ...(q.type ? { type: q.type } : {}),
      ...(q.documentType ? { documentType: q.documentType } : {}),
      ...(q.locationId ? { OR: [{ fromLocationId: q.locationId }, { toLocationId: q.locationId }] } : {}),
      ...(q.from || q.to ? { createdAt: { gte: q.from, lte: q.to } } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        include: {
          product: true,
          fromLocation: true,
          toLocation: true,
          user: { select: { id: true, username: true, fullName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
      prisma.stockMovement.count({ where }),
    ]);
    res.json({ items, meta: { page: q.page, pageSize: q.pageSize, total, totalPages: Math.max(1, Math.ceil(total / q.pageSize)) } });
  }),
);
