import { Router } from 'express';
import { ah } from '../../core/asyncHandler.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { prisma } from '../../lib/prisma.js';

export const notificationsRoutes = Router();
notificationsRoutes.use(requireAuth);

notificationsRoutes.get(
  '/',
  ah(async (req, res) => {
    const items = await prisma.notification.findMany({ where: { userId: req.user!.sub }, orderBy: { createdAt: 'desc' }, take: 50 });
    res.json(items);
  }),
);

notificationsRoutes.post(
  '/:id/read',
  ah(async (req, res) => {
    const notification = await prisma.notification.updateMany({
      where: { id: Number(req.params.id), userId: req.user!.sub },
      data: { read: true },
    });
    res.json({ updated: notification.count });
  }),
);

notificationsRoutes.post(
  '/read-all',
  ah(async (req, res) => {
    await prisma.notification.updateMany({ where: { userId: req.user!.sub, read: false }, data: { read: true } });
    res.status(204).send();
  }),
);
