import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';

const include = { category: true, brand: true, unit: true } satisfies Prisma.ProductInclude;

export const productsRepository = {
  async findMany(params: { page: number; pageSize: number; search?: string; categoryId?: number; brandId?: number }) {
    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
      ...(params.categoryId ? { categoryId: params.categoryId } : {}),
      ...(params.brandId ? { brandId: params.brandId } : {}),
      ...(params.search
        ? {
            OR: [
              { sku: { contains: params.search, mode: 'insensitive' } },
              { name: { contains: params.search, mode: 'insensitive' } },
              { barcode: { contains: params.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include,
        orderBy: { sku: 'asc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      prisma.product.count({ where }),
    ]);
    return { items, total };
  },

  findById(id: number) {
    return prisma.product.findFirst({ where: { id, deletedAt: null }, include });
  },

  findByBarcodeOrSku(value: string) {
    return prisma.product.findFirst({ where: { deletedAt: null, OR: [{ barcode: value }, { sku: value }] }, include });
  },

  create(data: Prisma.ProductUncheckedCreateInput) {
    return prisma.product.create({ data, include });
  },

  update(id: number, data: Prisma.ProductUncheckedUpdateInput) {
    return prisma.product.update({ where: { id }, data, include });
  },

  softDelete(id: number) {
    return prisma.product.update({ where: { id }, data: { deletedAt: new Date() } });
  },
};
