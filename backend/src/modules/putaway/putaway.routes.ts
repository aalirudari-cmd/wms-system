import { Router } from 'express';
import { ah } from '../../core/asyncHandler.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { confirmPutAwaySchema, putAwayQuerySchema } from './putaway.schema.js';
import { putAwayService } from './putaway.service.js';

export const putAwayRoutes = Router();

putAwayRoutes.use(requireAuth);

putAwayRoutes.get(
  '/',
  requirePermission('putaway:view'),
  validate(putAwayQuerySchema, 'query'),
  ah(async (req, res) => {
    const q = req.query as any;
    const { items, total } = await putAwayService.list(q);
    res.json({ items, meta: { page: q.page, pageSize: q.pageSize, total, totalPages: Math.max(1, Math.ceil(total / q.pageSize)) } });
  }),
);

putAwayRoutes.post(
  '/:id/confirm',
  requirePermission('putaway:confirm'),
  validate(confirmPutAwaySchema),
  ah(async (req, res) => {
    res.json(await putAwayService.confirm(Number(req.params.id), req.body, req.user!.sub));
  }),
);
