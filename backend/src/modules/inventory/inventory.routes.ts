import { Router } from 'express';
import { ah } from '../../core/asyncHandler.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { adjustInventorySchema, inventoryQuerySchema } from './inventory.schema.js';
import { inventoryController } from './inventory.controller.js';

export const inventoryRoutes = Router();

inventoryRoutes.use(requireAuth);
inventoryRoutes.get('/', requirePermission('inventory:view'), validate(inventoryQuerySchema, 'query'), ah(inventoryController.list));
inventoryRoutes.post('/adjust', requirePermission('inventory:adjust'), validate(adjustInventorySchema), ah(inventoryController.adjust));
