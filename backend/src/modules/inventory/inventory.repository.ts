import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';

const include = {
  product: { include: { unit: true } },
  location: { include: { warehouse: true } },
} satisfies Prisma.InventoryItemInclude;

export const inventoryRepository = {
  async findMany(params: { page: number; pageSize: number; productId?: number; locationId?: number; warehouseId?: number }) {
    const where: Prisma.InventoryItemWhereInput = {
      ...(params.productId ? { productId: params.productId } : {}),
      ...(params.locationId ? { locationId: params.locationId } : {}),
      ...(params.warehouseId ? { warehouseId: params.warehouseId } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.inventoryItem.findMany({
        where,
        include,
        orderBy: { updatedAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      prisma.inventoryItem.count({ where }),
    ]);
    return { items, total };
  },

  summaryByProduct(productId: number) {
    return prisma.inventoryItem.groupBy({
      by: ['productId'],
      where: { productId },
      _sum: { quantityAvailable: true, quantityReserved: true, quantityBlocked: true, quantityDamaged: true },
    });
  },
};
