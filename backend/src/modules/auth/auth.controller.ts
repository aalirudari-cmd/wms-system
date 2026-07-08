import type { Request, Response } from 'express';
import { isProduction } from '../../config/env.js';
import { authService } from './auth.service.js';
import type { LoginInput } from './auth.schema.js';

const REFRESH_COOKIE = 'wms_refresh';

function setRefreshCookie(res: Response, token: string, expiresAt: Date) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    expires: expiresAt,
    path: '/api/auth',
  });
}

export const authController = {
  async login(req: Request, res: Response) {
    const result = await authService.login(req.body as LoginInput, {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });
    setRefreshCookie(res, result.refreshToken, result.refreshExpiresAt);
    res.json({ accessToken: result.accessToken, user: result.user });
  },

  async refresh(req: Request, res: Response) {
    const result = await authService.refresh(req.cookies?.[REFRESH_COOKIE], {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });
    setRefreshCookie(res, result.refreshToken, result.refreshExpiresAt);
    res.json({ accessToken: result.accessToken, user: result.user });
  },

  async logout(req: Request, res: Response) {
    await authService.logout(req.cookies?.[REFRESH_COOKIE]);
    res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
    res.status(204).send();
  },

  async me(req: Request, res: Response) {
    const me = await authService.me(req.user!.sub);
    res.json(me);
  },
};
