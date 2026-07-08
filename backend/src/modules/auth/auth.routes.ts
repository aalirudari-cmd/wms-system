import { Router } from 'express';
import { ah } from '../../core/asyncHandler.js';
import { validate } from '../../middleware/validate.middleware.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { authRateLimiter } from '../../middleware/rateLimit.middleware.js';
import { loginSchema } from './auth.schema.js';
import { authController } from './auth.controller.js';

export const authRoutes = Router();

authRoutes.post('/login', authRateLimiter, validate(loginSchema), ah(authController.login));
authRoutes.post('/refresh', authRateLimiter, ah(authController.refresh));
authRoutes.post('/logout', ah(authController.logout));
authRoutes.get('/me', requireAuth, ah(authController.me));
