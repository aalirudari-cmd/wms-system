import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';

export const locationsRepository = {
  async findMany(params: {
    page: number;
    pageSize: number;
    search?: string;
    warehouseId?: number;
    type?: string;
    parentId?: number;
  }) {
    const where: Prisma.LocationWhereInput = {
      deletedAt: null,
      ...(params.warehouseId ? { warehouseId: params.warehouseId } : {}),
      ...(params.type ? { type: params.type as Prisma.EnumLocationTypeFilter['equals'] } : {}),
      ...(params.parentId ? { parentId: params.parentId } : {}),
      ...(params.search
        ? {
            OR: [
              { code: { contains: params.search, mode: 'insensitive' } },
              { name: { contains: params.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.location.findMany({
        where,
        include: { warehouse: true, parent: true, _count: { select: { inventoryItems: true, children: true } } },
        orderBy: { code: 'asc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      prisma.location.count({ where }),
    ]);
    return { items, total };
  },

  findById(id: number) {
    return prisma.location.findFirst({
      where: { id, deletedAt: null },
      include: { warehouse: true, parent: true, children: true },
    });
  },

  findByCodeOrBarcode(value: string) {
    return prisma.location.findFirst({
      where: { deletedAt: null, OR: [{ code: value }, { barcode: value }, { qrCode: value }] },
    });
  },

  create(data: Prisma.LocationUncheckedCreateInput) {
    return prisma.location.create({ data });
  },

  update(id: number, data: Prisma.LocationUncheckedUpdateInput) {
    return prisma.location.update({ where: { id }, data });
  },

  softDelete(id: number) {
    return prisma.location.update({ where: { id }, data: { deletedAt: new Date() } });
  },
};
