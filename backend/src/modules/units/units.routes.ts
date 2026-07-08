import { prisma } from '../../lib/prisma.js';
import { createCrudModule } from '../../core/crudFactory.js';
import { createUnitSchema, updateUnitSchema } from './units.schema.js';

export const unitsModule = createCrudModule({
  entityName: 'Unit',
  delegate: prisma.unit,
  permissionModule: 'masterdata',
  searchFields: ['code', 'name'],
  createSchema: createUnitSchema,
  updateSchema: updateUnitSchema,
  softDelete: false,
});

export const unitsRoutes = unitsModule.router;
