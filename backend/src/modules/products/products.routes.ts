import { Router } from 'express';
import { ah } from '../../core/asyncHandler.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { createProductSchema, updateProductSchema, productQuerySchema } from './products.schema.js';
import { productsController } from './products.controller.js';

export const productsRoutes = Router();

productsRoutes.use(requireAuth);
productsRoutes.get('/', requirePermission('masterdata:view'), validate(productQuerySchema, 'query'), ah(productsController.list));
productsRoutes.get('/scan/:code', requirePermission('masterdata:view'), ah(productsController.scan));
productsRoutes.get('/:id', requirePermission('masterdata:view'), ah(productsController.get));
productsRoutes.post('/', requirePermission('masterdata:manage'), validate(createProductSchema), ah(productsController.create));
productsRoutes.patch('/:id', requirePermission('masterdata:manage'), validate(updateProductSchema), ah(productsController.update));
productsRoutes.delete('/:id', requirePermission('masterdata:manage'), ah(productsController.remove));
