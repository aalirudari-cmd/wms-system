import bcrypt from 'bcryptjs';
import { ConflictError, NotFoundError } from '../../core/errors.js';
import { usersRepository } from './users.repository.js';
import type { createUserSchema, updateUserSchema } from './users.schema.js';
import type { z } from 'zod';

export const usersService = {
  list: (params: Parameters<typeof usersRepository.findMany>[0]) => usersRepository.findMany(params),

  async get(id: number) {
    const user = await usersRepository.findById(id);
    if (!user) throw new NotFoundError('User');
    return user;
  },

  async create(input: z.infer<typeof createUserSchema>) {
    const existing = await usersRepository.findByUsernameOrEmail(input.username, input.email);
    if (existing) throw new ConflictError('Username or email already in use.');
    const passwordHash = await bcrypt.hash(input.password, 10);
    return usersRepository.create({
      username: input.username,
      email: input.email,
      passwordHash,
      fullName: input.fullName,
      roleId: input.roleId,
      active: input.active ?? true,
    });
  },

  async update(id: number, input: z.infer<typeof updateUserSchema>) {
    await this.get(id);
    const { password, ...rest } = input;
    const data: Record<string, unknown> = { ...rest };
    if (password) data.passwordHash = await bcrypt.hash(password, 10);
    return usersRepository.update(id, data);
  },

  async remove(id: number) {
    await this.get(id);
    return usersRepository.softDelete(id);
  },
};
