import { prisma } from '../../lib/prisma.js';
import { createCrudModule } from '../../core/crudFactory.js';
import { createSupplierSchema, updateSupplierSchema } from './suppliers.schema.js';

export const suppliersModule = createCrudModule({
  entityName: 'Supplier',
  delegate: prisma.supplier,
  permissionModule: 'masterdata',
  searchFields: ['code', 'name', 'email'],
  createSchema: createSupplierSchema,
  updateSchema: updateSupplierSchema,
});

export const suppliersRoutes = suppliersModule.router;
