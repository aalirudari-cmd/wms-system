import { Router } from 'express';
import { z } from 'zod';
import { ah } from '../../core/asyncHandler.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { prisma } from '../../lib/prisma.js';

export const auditRoutes = Router();

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  entityType: z.string().optional(),
});

auditRoutes.use(requireAuth, requirePermission('audit:view'));
auditRoutes.get(
  '/',
  validate(querySchema, 'query'),
  ah(async (req, res) => {
    const q = req.query as any;
    const where = q.entityType ? { entityType: q.entityType } : {};
    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: { user: { select: { id: true, username: true, fullName: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
      prisma.auditLog.count({ where }),
    ]);
    res.json({ items, meta: { page: q.page, pageSize: q.pageSize, total, totalPages: Math.max(1, Math.ceil(total / q.pageSize)) } });
  }),
);
