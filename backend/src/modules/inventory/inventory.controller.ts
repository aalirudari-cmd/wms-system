import type { Request, Response } from 'express';
import { inventoryService } from './inventory.service.js';

export const inventoryController = {
  async list(req: Request, res: Response) {
    const q = req.query as any;
    const { items, total } = await inventoryService.list(q);
    res.json({ items, meta: { page: q.page, pageSize: q.pageSize, total, totalPages: Math.max(1, Math.ceil(total / q.pageSize)) } });
  },
  async adjust(req: Request, res: Response) {
    res.status(201).json(await inventoryService.adjust(req.body, req.user!.sub));
  },
};
