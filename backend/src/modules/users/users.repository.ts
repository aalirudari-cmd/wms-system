import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';

const select = {
  id: true,
  username: true,
  email: true,
  fullName: true,
  active: true,
  lastLoginAt: true,
  createdAt: true,
  role: { select: { id: true, name: true } },
} satisfies Prisma.UserSelect;

export const usersRepository = {
  async findMany(params: { page: number; pageSize: number; search?: string; roleId?: number }) {
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(params.roleId ? { roleId: params.roleId } : {}),
      ...(params.search
        ? {
            OR: [
              { username: { contains: params.search, mode: 'insensitive' } },
              { fullName: { contains: params.search, mode: 'insensitive' } },
              { email: { contains: params.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.user.findMany({ where, select, orderBy: { username: 'asc' }, skip: (params.page - 1) * params.pageSize, take: params.pageSize }),
      prisma.user.count({ where }),
    ]);
    return { items, total };
  },

  findById(id: number) {
    return prisma.user.findFirst({ where: { id, deletedAt: null }, select });
  },

  findByUsernameOrEmail(username: string, email: string) {
    return prisma.user.findFirst({ where: { OR: [{ username }, { email }] } });
  },

  create(data: Prisma.UserUncheckedCreateInput) {
    return prisma.user.create({ data, select });
  },

  update(id: number, data: Prisma.UserUncheckedUpdateInput) {
    return prisma.user.update({ where: { id }, data, select });
  },

  softDelete(id: number) {
    return prisma.user.update({ where: { id }, data: { deletedAt: new Date(), active: false } });
  },
};
