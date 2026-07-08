import type { Request, Response } from 'express';
import { receivingService } from './receiving.service.js';

export const receivingController = {
  async createPo(req: Request, res: Response) {
    res.status(201).json(await receivingService.createPurchaseOrder(req.body));
  },
  async listPos(_req: Request, res: Response) {
    res.json(await receivingService.listPurchaseOrders());
  },
  async createAsn(req: Request, res: Response) {
    res.status(201).json(await receivingService.createAsn(req.body));
  },
  async listAsns(_req: Request, res: Response) {
    res.json(await receivingService.listAsns());
  },
  async list(req: Request, res: Response) {
    const q = req.query as any;
    const { items, total } = await receivingService.list(q);
    res.json({ items, meta: { page: q.page, pageSize: q.pageSize, total, totalPages: Math.max(1, Math.ceil(total / q.pageSize)) } });
  },
  async get(req: Request, res: Response) {
    res.json(await receivingService.get(Number(req.params.id)));
  },
  async create(req: Request, res: Response) {
    res.status(201).json(await receivingService.create(req.body, req.user!.sub));
  },
  async start(req: Request, res: Response) {
    res.json(await receivingService.start(Number(req.params.id)));
  },
  async updateLine(req: Request, res: Response) {
    res.json(await receivingService.updateLine(Number(req.params.lineId), req.body));
  },
  async complete(req: Request, res: Response) {
    res.json(await receivingService.complete(Number(req.params.id), req.user!.sub));
  },
  async reject(req: Request, res: Response) {
    res.json(await receivingService.reject(Number(req.params.id)));
  },
};
