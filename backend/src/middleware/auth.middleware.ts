import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { UnauthorizedError } from '../core/errors.js';

export interface AccessTokenPayload {
  sub: number;
  username: string;
  roleId: number;
  roleName: string;
  permissions: string[];
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.jwt.accessSecret, { expiresIn: env.jwt.accessTtl as jwt.SignOptions['expiresIn'] });
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing bearer token.');
  }
  const token = header.slice('Bearer '.length);
  try {
    req.user = jwt.verify(token, env.jwt.accessSecret) as unknown as AccessTokenPayload;
    next();
  } catch {
    throw new UnauthorizedError('Invalid or expired token.');
  }
}
