import { Router } from 'express';
import { ah } from '../../core/asyncHandler.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { createUserSchema, updateUserSchema, userQuerySchema } from './users.schema.js';
import { usersController } from './users.controller.js';

export const usersRoutes = Router();

usersRoutes.use(requireAuth, requirePermission('users:view', 'users:manage'));
usersRoutes.get('/', validate(userQuerySchema, 'query'), ah(usersController.list));
usersRoutes.get('/:id', ah(usersController.get));
usersRoutes.post('/', requirePermission('users:manage'), validate(createUserSchema), ah(usersController.create));
usersRoutes.patch('/:id', requirePermission('users:manage'), validate(updateUserSchema), ah(usersController.update));
usersRoutes.delete('/:id', requirePermission('users:manage'), ah(usersController.remove));
