import { prisma } from '../../lib/prisma.js';
import { createCrudModule } from '../../core/crudFactory.js';
import { createBrandSchema, updateBrandSchema } from './brands.schema.js';

export const brandsModule = createCrudModule({
  entityName: 'Brand',
  delegate: prisma.brand,
  permissionModule: 'masterdata',
  searchFields: ['name'],
  createSchema: createBrandSchema,
  updateSchema: updateBrandSchema,
});

export const brandsRoutes = brandsModule.router;
