/* eslint-disable @typescript-eslint/no-explicit-any */
import { Router } from 'express';
import type { ZodSchema } from 'zod';
import { Router as ExpressRouter } from 'express';
import { ah } from './asyncHandler.js';
import { validate } from '../middleware/validate.middleware.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';
import { paginationSchema, paginationMeta } from './pagination.js';
import { NotFoundError } from './errors.js';

/**
 * Simple master-data entities (code/name, soft delete, no bespoke workflow)
 * share one CRUD shape. This factory builds the repository → service →
 * controller → router stack for one, so those modules stay a config object
 * instead of five near-identical files each. Modules with real business
 * logic (products, locations, receiving, ...) are written by hand instead.
 */
export function createCrudModule(options: {
  entityName: string;
  delegate: any; // a Prisma model delegate, e.g. prisma.warehouse
  permissionModule: string; // e.g. "masterdata" -> masterdata:view / masterdata:manage
  searchFields?: string[];
  createSchema: ZodSchema;
  updateSchema: ZodSchema;
  orderBy?: Record<string, 'asc' | 'desc'>;
  softDelete?: boolean;
  include?: Record<string, unknown>;
}) {
  const { entityName, delegate, permissionModule, searchFields = ['name'], softDelete = true, include } = options;
  const viewPermission = `${permissionModule}:view`;
  const managePermission = `${permissionModule}:manage`;

  const baseWhere = () => (softDelete ? { deletedAt: null } : {});

  const repository = {
    async findMany(page: number, pageSize: number, search?: string) {
      const where: any = { ...baseWhere() };
      if (search && searchFields.length) {
        where.OR = searchFields.map((field) => ({ [field]: { contains: search, mode: 'insensitive' } }));
      }
      const [items, total] = await Promise.all([
        delegate.findMany({
          where,
          include,
          orderBy: options.orderBy ?? { id: 'asc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        delegate.count({ where }),
      ]);
      return { items, total };
    },
    findById(id: number) {
      return delegate.findFirst({ where: { id, ...baseWhere() }, include });
    },
    create(data: unknown) {
      return delegate.create({ data, include });
    },
    update(id: number, data: unknown) {
      return delegate.update({ where: { id }, data, include });
    },
    remove(id: number) {
      return softDelete
        ? delegate.update({ where: { id }, data: { deletedAt: new Date() } })
        : delegate.delete({ where: { id } });
    },
  };

  const service = {
    list: (page: number, pageSize: number, search?: string) => repository.findMany(page, pageSize, search),
    async get(id: number) {
      const item = await repository.findById(id);
      if (!item) throw new NotFoundError(entityName);
      return item;
    },
    create: (data: unknown) => repository.create(data),
    async update(id: number, data: unknown) {
      await service.get(id);
      return repository.update(id, data);
    },
    async remove(id: number) {
      await service.get(id);
      return repository.remove(id);
    },
  };

  const controller = {
    async list(req: any, res: any) {
      const { page, pageSize, search } = req.query as ReturnType<typeof paginationSchema.parse>;
      const { items, total } = await service.list(page, pageSize, search);
      res.json({ items, meta: paginationMeta(page, pageSize, total) });
    },
    async get(req: any, res: any) {
      res.json(await service.get(Number(req.params.id)));
    },
    async create(req: any, res: any) {
      res.status(201).json(await service.create(req.body));
    },
    async update(req: any, res: any) {
      res.json(await service.update(Number(req.params.id), req.body));
    },
    async remove(req: any, res: any) {
      await service.remove(Number(req.params.id));
      res.status(204).send();
    },
  };

  const router: Router = ExpressRouter();
  router.use(requireAuth);
  router.get('/', requirePermission(viewPermission), validate(paginationSchema, 'query'), ah(controller.list));
  router.get('/:id', requirePermission(viewPermission), ah(controller.get));
  router.post('/', requirePermission(managePermission), validate(options.createSchema), ah(controller.create));
  router.patch('/:id', requirePermission(managePermission), validate(options.updateSchema), ah(controller.update));
  router.delete('/:id', requirePermission(managePermission), ah(controller.remove));

  return { repository, service, controller, router };
}
