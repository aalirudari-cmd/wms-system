import { Router } from 'express';
import { ah } from '../../core/asyncHandler.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { createLocationSchema, updateLocationSchema, locationQuerySchema } from './locations.schema.js';
import { locationsController } from './locations.controller.js';

export const locationsRoutes = Router();

locationsRoutes.use(requireAuth);
locationsRoutes.get('/', requirePermission('masterdata:view'), validate(locationQuerySchema, 'query'), ah(locationsController.list));
locationsRoutes.get('/scan/:code', requirePermission('masterdata:view'), ah(locationsController.scan));
locationsRoutes.get('/:id', requirePermission('masterdata:view'), ah(locationsController.get));
locationsRoutes.post('/', requirePermission('masterdata:manage'), validate(createLocationSchema), ah(locationsController.create));
locationsRoutes.patch('/:id', requirePermission('masterdata:manage'), validate(updateLocationSchema), ah(locationsController.update));
locationsRoutes.delete('/:id', requirePermission('masterdata:manage'), ah(locationsController.remove));
