import { Router } from 'express';
import { ah } from '../../core/asyncHandler.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { createCycleCountSchema, recordCountLineSchema } from './controlling.schema.js';
import { controllingService } from './controlling.service.js';

export const controllingRoutes = Router();
controllingRoutes.use(requireAuth);

controllingRoutes.get('/', requirePermission('controlling:view'), ah(async (_req, res) => res.json(await controllingService.list())));
controllingRoutes.get('/:id', requirePermission('controlling:view'), ah(async (req, res) => res.json(await controllingService.get(Number(req.params.id)))));
controllingRoutes.post('/', requirePermission('controlling:count'), validate(createCycleCountSchema), ah(async (req, res) => res.status(201).json(await controllingService.create(req.body, req.user!.sub))));
controllingRoutes.patch(
  '/:id/lines/:lineId',
  requirePermission('controlling:count'),
  validate(recordCountLineSchema),
  ah(async (req, res) => res.json(await controllingService.recordLine(Number(req.params.id), Number(req.params.lineId), req.body))),
);
controllingRoutes.post('/:id/submit', requirePermission('controlling:count'), ah(async (req, res) => res.json(await controllingService.submit(Number(req.params.id)))));
controllingRoutes.post('/:id/approve', requirePermission('controlling:approve'), ah(async (req, res) => res.json(await controllingService.approve(Number(req.params.id), req.user!.sub))));
controllingRoutes.post('/:id/reject', requirePermission('controlling:approve'), ah(async (req, res) => res.json(await controllingService.reject(Number(req.params.id), req.user!.sub))));
