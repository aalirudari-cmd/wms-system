import { Router } from 'express';
import { ah } from '../../core/asyncHandler.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { createRoleSchema, updateRoleSchema, updateRolePermissionsSchema } from './roles.schema.js';
import { rolesController } from './roles.controller.js';

export const rolesRoutes = Router();

rolesRoutes.use(requireAuth, requirePermission('roles:view', 'roles:manage'));
rolesRoutes.get('/', ah(rolesController.listRoles));
rolesRoutes.get('/permissions', ah(rolesController.listPermissions));
rolesRoutes.get('/:id', ah(rolesController.getRole));
rolesRoutes.post('/', requirePermission('roles:manage'), validate(createRoleSchema), ah(rolesController.createRole));
rolesRoutes.patch('/:id', requirePermission('roles:manage'), validate(updateRoleSchema), ah(rolesController.updateRole));
rolesRoutes.put('/:id/permissions', requirePermission('roles:manage'), validate(updateRolePermissionsSchema), ah(rolesController.setPermissions));
rolesRoutes.delete('/:id', requirePermission('roles:manage'), ah(rolesController.deleteRole));
