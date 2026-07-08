import { Router } from 'express';
import { ah } from '../../core/asyncHandler.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { createPickingListSchema, createSalesOrderSchema, confirmPickLineSchema, pickingListQuerySchema } from './picking.schema.js';
import { pickingService } from './picking.service.js';

export const pickingRoutes = Router();
pickingRoutes.use(requireAuth);

pickingRoutes.get('/sales-orders', requirePermission('picking:view'), ah(async (req, res) => res.json(await pickingService.listSalesOrders())));
pickingRoutes.post('/sales-orders', requirePermission('picking:create'), validate(createSalesOrderSchema), ah(async (req, res) => res.status(201).json(await pickingService.createSalesOrder(req.body))));

pickingRoutes.get(
  '/lists',
  requirePermission('picking:view'),
  validate(pickingListQuerySchema, 'query'),
  ah(async (req, res) => {
    const q = req.query as any;
    const { items, total } = await pickingService.list(q);
    res.json({ items, meta: { page: q.page, pageSize: q.pageSize, total, totalPages: Math.max(1, Math.ceil(total / q.pageSize)) } });
  }),
);
pickingRoutes.get('/lists/:id', requirePermission('picking:view'), ah(async (req, res) => res.json(await pickingService.get(Number(req.params.id)))));
pickingRoutes.post('/lists', requirePermission('picking:create'), validate(createPickingListSchema), ah(async (req, res) => res.status(201).json(await pickingService.createPickingList(req.body))));
pickingRoutes.post('/lists/:id/assign', requirePermission('picking:create'), ah(async (req, res) => res.json(await pickingService.assign(Number(req.params.id), req.body.assignedToId))));
pickingRoutes.post(
  '/lists/:id/lines/:lineId/confirm',
  requirePermission('picking:pick'),
  validate(confirmPickLineSchema),
  ah(async (req, res) => res.json(await pickingService.confirmLine(Number(req.params.id), Number(req.params.lineId), req.body, req.user!.sub))),
);
