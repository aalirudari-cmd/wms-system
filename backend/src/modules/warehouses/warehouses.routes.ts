import { prisma } from '../../lib/prisma.js';
import { createCrudModule } from '../../core/crudFactory.js';
import { createWarehouseSchema, updateWarehouseSchema } from './warehouses.schema.js';

export const warehousesModule = createCrudModule({
  entityName: 'Warehouse',
  delegate: prisma.warehouse,
  permissionModule: 'masterdata',
  searchFields: ['code', 'name'],
  createSchema: createWarehouseSchema,
  updateSchema: updateWarehouseSchema,
});

export const warehousesRoutes = warehousesModule.router;
