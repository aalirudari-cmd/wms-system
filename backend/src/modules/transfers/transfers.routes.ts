import { Router } from 'express';
import { ah } from '../../core/asyncHandler.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { createTransferSchema, confirmTransferLineSchema, transferQuerySchema } from './transfers.schema.js';
import { transfersService } from './transfers.service.js';

export const transfersRoutes = Router();

transfersRoutes.use(requireAuth);

transfersRoutes.get(
  '/',
  requirePermission('transfers:view'),
  validate(transferQuerySchema, 'query'),
  ah(async (req, res) => {
    const q = req.query as any;
    const { items, total } = await transfersService.list(q);
    res.json({ items, meta: { page: q.page, pageSize: q.pageSize, total, totalPages: Math.max(1, Math.ceil(total / q.pageSize)) } });
  }),
);
transfersRoutes.get('/:id', requirePermission('transfers:view'), ah(async (req, res) => res.json(await transfersService.get(Number(req.params.id)))));
transfersRoutes.post(
  '/',
  requirePermission('transfers:create'),
  validate(createTransferSchema),
  ah(async (req, res) => res.status(201).json(await transfersService.create(req.body, req.user!.sub))),
);
transfersRoutes.post('/:id/approve', requirePermission('transfers:approve'), ah(async (req, res) => res.json(await transfersService.approve(Number(req.params.id), req.user!.sub))));
transfersRoutes.post(
  '/:id/lines/:lineId/confirm',
  requirePermission('transfers:complete'),
  validate(confirmTransferLineSchema),
  ah(async (req, res) =>
    res.json(await transfersService.confirmLine(Number(req.params.id), Number(req.params.lineId), req.body.quantityConfirmed, req.user!.sub)),
  ),
);
transfersRoutes.post('/:id/cancel', requirePermission('transfers:create'), ah(async (req, res) => res.json(await transfersService.cancel(Number(req.params.id)))));
