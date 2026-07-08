import type { Request, Response } from 'express';
import { productsService } from './products.service.js';

export const productsController = {
  async list(req: Request, res: Response) {
    const q = req.query as any;
    const { items, total } = await productsService.list(q);
    res.json({ items, meta: { page: q.page, pageSize: q.pageSize, total, totalPages: Math.max(1, Math.ceil(total / q.pageSize)) } });
  },
  async get(req: Request, res: Response) {
    res.json(await productsService.get(Number(req.params.id)));
  },
  async scan(req: Request, res: Response) {
    res.json(await productsService.scan(String(req.params.code)));
  },
  async create(req: Request, res: Response) {
    res.status(201).json(await productsService.create(req.body));
  },
  async update(req: Request, res: Response) {
    res.json(await productsService.update(Number(req.params.id), req.body));
  },
  async remove(req: Request, res: Response) {
    await productsService.remove(Number(req.params.id));
    res.status(204).send();
  },
};
