import { Router } from 'express';
import { ah } from '../../core/asyncHandler.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import {
  createAsnSchema,
  createGoodsReceiptSchema,
  createPurchaseOrderSchema,
  receiptQuerySchema,
  updateReceiptLineSchema,
} from './receiving.schema.js';
import { receivingController } from './receiving.controller.js';

export const receivingRoutes = Router();

receivingRoutes.use(requireAuth);

receivingRoutes.get('/purchase-orders', requirePermission('receiving:view'), ah(receivingController.listPos));
receivingRoutes.post('/purchase-orders', requirePermission('receiving:create'), validate(createPurchaseOrderSchema), ah(receivingController.createPo));

receivingRoutes.get('/asns', requirePermission('receiving:view'), ah(receivingController.listAsns));
receivingRoutes.post('/asns', requirePermission('receiving:create'), validate(createAsnSchema), ah(receivingController.createAsn));

receivingRoutes.get('/', requirePermission('receiving:view'), validate(receiptQuerySchema, 'query'), ah(receivingController.list));
receivingRoutes.get('/:id', requirePermission('receiving:view'), ah(receivingController.get));
receivingRoutes.post('/', requirePermission('receiving:create'), validate(createGoodsReceiptSchema), ah(receivingController.create));
receivingRoutes.post('/:id/start', requirePermission('receiving:process'), ah(receivingController.start));
receivingRoutes.patch('/lines/:lineId', requirePermission('receiving:process'), validate(updateReceiptLineSchema), ah(receivingController.updateLine));
receivingRoutes.post('/:id/complete', requirePermission('receiving:complete'), ah(receivingController.complete));
receivingRoutes.post('/:id/reject', requirePermission('receiving:complete'), ah(receivingController.reject));
