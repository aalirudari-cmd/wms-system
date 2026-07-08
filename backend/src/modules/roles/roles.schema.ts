import { z } from 'zod';

export const createRoleSchema = z.object({
  name: z.string().min(1).max(60),
  description: z.string().max(300).optional(),
  permissionKeys: z.array(z.string()).default([]),
});

export const updateRolePermissionsSchema = z.object({
  permissionKeys: z.array(z.string()),
});

export const updateRoleSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  description: z.string().max(300).optional(),
});
