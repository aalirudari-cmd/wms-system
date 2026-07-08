import { prisma } from '../../lib/prisma.js';
import { BadRequestError, ConflictError, NotFoundError } from '../../core/errors.js';

const include = { permissions: { include: { permission: true } } };

export const rolesService = {
  listRoles: () => prisma.role.findMany({ include, orderBy: { id: 'asc' } }),

  listPermissions: () => prisma.permission.findMany({ orderBy: [{ module: 'asc' }, { key: 'asc' }] }),

  async getRole(id: number) {
    const role = await prisma.role.findUnique({ where: { id }, include });
    if (!role) throw new NotFoundError('Role');
    return role;
  },

  async createRole(input: { name: string; description?: string; permissionKeys: string[] }) {
    const existing = await prisma.role.findUnique({ where: { name: input.name } });
    if (existing) throw new ConflictError('A role with that name already exists.');
    const permissions = await prisma.permission.findMany({ where: { key: { in: input.permissionKeys } } });
    return prisma.role.create({
      data: {
        name: input.name,
        description: input.description,
        permissions: { create: permissions.map((p) => ({ permissionId: p.id })) },
      },
      include,
    });
  },

  async updateRole(id: number, input: { name?: string; description?: string }) {
    const role = await this.getRole(id);
    if (role.isSystem && input.name) throw new BadRequestError('Cannot rename a built-in role.');
    return prisma.role.update({ where: { id }, data: input, include });
  },

  // This is the "configurable permissions per role" requirement: an Admin can
  // regrant a role's permission set at runtime; users on that role pick it up
  // the next time their access token is refreshed.
  async setRolePermissions(id: number, permissionKeys: string[]) {
    await this.getRole(id);
    const permissions = await prisma.permission.findMany({ where: { key: { in: permissionKeys } } });
    await prisma.rolePermission.deleteMany({ where: { roleId: id } });
    await prisma.rolePermission.createMany({ data: permissions.map((p) => ({ roleId: id, permissionId: p.id })) });
    return this.getRole(id);
  },

  async deleteRole(id: number) {
    const role = await this.getRole(id);
    if (role.isSystem) throw new BadRequestError('Cannot delete a built-in role.');
    const usersOnRole = await prisma.user.count({ where: { roleId: id, deletedAt: null } });
    if (usersOnRole > 0) throw new ConflictError('Cannot delete a role that has users assigned to it.');
    return prisma.role.delete({ where: { id } });
  },
};
