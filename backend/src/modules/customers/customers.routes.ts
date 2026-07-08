import { prisma } from '../../lib/prisma.js';
import { createCrudModule } from '../../core/crudFactory.js';
import { createCustomerSchema, updateCustomerSchema } from './customers.schema.js';

export const customersModule = createCrudModule({
  entityName: 'Customer',
  delegate: prisma.customer,
  permissionModule: 'masterdata',
  searchFields: ['code', 'name', 'email'],
  createSchema: createCustomerSchema,
  updateSchema: updateCustomerSchema,
});

export const customersRoutes = customersModule.router;
