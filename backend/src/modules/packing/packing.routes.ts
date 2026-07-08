import { Router } from 'express';
import { ah } from '../../core/asyncHandler.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { prisma } from '../../lib/prisma.js';
import { NotFoundError, BadRequestError } from '../../core/errors.js';
import { createPackageSchema, closePackageSchema } from './packing.schema.js';

export const packingRoutes = Router();
packingRoutes.use(requireAuth);

const include = { salesOrder: { include: { customer: true } }, lines: { include: { product: true } }, closedBy: { select: { id: true, fullName: true } } };

packingRoutes.get(
  '/',
  requirePermission('packing:view'),
  ah(async (_req, res) => {
    res.json(await prisma.package.findMany({ include, orderBy: { createdAt: 'desc' } }));
  }),
);

packingRoutes.post(
  '/',
  requirePermission('packing:pack'),
  validate(createPackageSchema),
  ah(async (req, res) => {
    const pkg = await prisma.package.create({
      data: { salesOrderId: req.body.salesOrderId, packageNumber: req.body.packageNumber, lines: { create: req.body.lines } },
      include,
    });
    res.status(201).json(pkg);
  }),
);

packingRoutes.post(
  '/:id/close',
  requirePermission('packing:pack'),
  validate(closePackageSchema),
  ah(async (req, res) => {
    const pkg = await prisma.package.findUnique({ where: { id: Number(req.params.id) } });
    if (!pkg) throw new NotFoundError('Package');
    if (pkg.status === 'CLOSED') throw new BadRequestError('Package already closed.');
    const closed = await prisma.package.update({
      where: { id: pkg.id },
      data: { ...req.body, status: 'CLOSED', closedById: req.user!.sub, closedAt: new Date() },
      include,
    });
    await prisma.salesOrder.update({ where: { id: pkg.salesOrderId }, data: { status: 'PACKED' } });
    res.json(closed);
  }),
);
