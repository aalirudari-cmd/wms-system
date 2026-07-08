import { z } from 'zod';

export const createUserSchema = z.object({
  username: z.string().min(3).max(40),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  fullName: z.string().min(1).max(150),
  roleId: z.number().int().positive(),
  active: z.boolean().optional(),
});

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  fullName: z.string().min(1).max(150).optional(),
  roleId: z.number().int().positive().optional(),
  active: z.boolean().optional(),
  password: z.string().min(8).max(100).optional(),
});

export const userQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(25),
  search: z.string().trim().optional(),
  roleId: z.coerce.number().int().positive().optional(),
});
