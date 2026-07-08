import { prisma } from '../../lib/prisma.js';
import { createCrudModule } from '../../core/crudFactory.js';
import { createCategorySchema, updateCategorySchema } from './categories.schema.js';

export const categoriesModule = createCrudModule({
  entityName: 'Category',
  delegate: prisma.category,
  permissionModule: 'masterdata',
  searchFields: ['name'],
  createSchema: createCategorySchema,
  updateSchema: updateCategorySchema,
});

export const categoriesRoutes = categoriesModule.router;
