import type { Request, Response } from 'express';
import { usersService } from './users.service.js';

export const usersController = {
  async list(req: Request, res: Response) {
    const q = req.query as any;
    const { items, total } = await usersService.list(q);
    res.json({ items, meta: { page: q.page, pageSize: q.pageSize, total, totalPages: Math.max(1, Math.ceil(total / q.pageSize)) } });
  },
  async get(req: Request, res: Response) {
    res.json(await usersService.get(Number(req.params.id)));
  },
  async create(req: Request, res: Response) {
    res.status(201).json(await usersService.create(req.body));
  },
  async update(req: Request, res: Response) {
    res.json(await usersService.update(Number(req.params.id), req.body));
  },
  async remove(req: Request, res: Response) {
    await usersService.remove(Number(req.params.id));
    res.status(204).send();
  },
};
