import type { NextFunction, Request, Response } from 'express';
import { ForbiddenError, UnauthorizedError } from '../core/errors.js';

/**
 * Permission keys are namespaced strings ("receiving:create") seeded onto
 * roles via RolePermission. A user's permission set is embedded in their
 * access token at login/refresh, so this check never hits the database.
 */
export function requirePermission(...anyOf: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw new UnauthorizedError();
    const has = anyOf.some((permission) => req.user!.permissions.includes(permission));
    if (!has) {
      throw new ForbiddenError(`Requires one of: ${anyOf.join(', ')}`);
    }
    next();
  };
}
