import { prisma } from '../../lib/prisma.js';

export const authRepository = {
  findUserByUsername(username: string) {
    return prisma.user.findFirst({
      where: { username, deletedAt: null },
      include: { role: { include: { permissions: { include: { permission: true } } } } },
    });
  },

  findUserById(id: number) {
    return prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: { role: { include: { permissions: { include: { permission: true } } } } },
    });
  },

  touchLastLogin(userId: number) {
    return prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
  },

  createRefreshToken(data: { userId: number; tokenHash: string; expiresAt: Date; userAgent?: string; ip?: string }) {
    return prisma.refreshToken.create({ data });
  },

  findRefreshTokenByHash(tokenHash: string) {
    return prisma.refreshToken.findUnique({ where: { tokenHash } });
  },

  revokeRefreshToken(id: number) {
    return prisma.refreshToken.update({ where: { id }, data: { revokedAt: new Date() } });
  },
};
