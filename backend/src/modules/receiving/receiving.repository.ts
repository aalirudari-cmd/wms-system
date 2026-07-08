import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';

const receiptInclude = {
  supplier: true,
  purchaseOrder: true,
  asn: true,
  createdBy: { select: { id: true, username: true, fullName: true } },
  lines: { include: { product: true, location: true, photos: true } },
} satisfies Prisma.GoodsReceiptInclude;

export const receivingRepository = {
  createPurchaseOrder(data: Prisma.PurchaseOrderUncheckedCreateInput & { lines: { create: any[] } }) {
    return prisma.purchaseOrder.create({ data, include: { lines: true, supplier: true } });
  },
  listPurchaseOrders() {
    return prisma.purchaseOrder.findMany({ include: { supplier: true, lines: true }, orderBy: { id: 'desc' } });
  },

  createAsn(data: any) {
    return prisma.asn.create({ data, include: { lines: true, supplier: true } });
  },
  listAsns() {
    return prisma.asn.findMany({ include: { supplier: true, lines: true }, orderBy: { id: 'desc' } });
  },

  async findMany(params: { page: number; pageSize: number; status?: string; search?: string }) {
    const where: Prisma.GoodsReceiptWhereInput = {
      ...(params.status ? { status: params.status as Prisma.EnumGoodsReceiptStatusFilter['equals'] } : {}),
      ...(params.search ? { receiptNumber: { contains: params.search, mode: 'insensitive' } } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.goodsReceipt.findMany({
        where,
        include: receiptInclude,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      prisma.goodsReceipt.count({ where }),
    ]);
    return { items, total };
  },

  findById(id: number) {
    return prisma.goodsReceipt.findUnique({ where: { id }, include: receiptInclude });
  },

  create(data: Prisma.GoodsReceiptUncheckedCreateInput & { lines: { create: any[] } }) {
    return prisma.goodsReceipt.create({ data, include: receiptInclude });
  },

  updateStatus(id: number, status: string, extra: Record<string, unknown> = {}) {
    return prisma.goodsReceipt.update({ where: { id }, data: { status: status as any, ...extra }, include: receiptInclude });
  },

  updateLine(lineId: number, data: any) {
    return prisma.goodsReceiptLine.update({ where: { id: lineId }, data, include: { photos: true } });
  },

  findLine(lineId: number) {
    return prisma.goodsReceiptLine.findUnique({ where: { id: lineId }, include: { goodsReceipt: true, product: true } });
  },
};
