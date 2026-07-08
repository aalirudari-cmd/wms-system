import type { Request, Response } from 'express';
import { rolesService } from './roles.service.js';

export const rolesController = {
  async listRoles(_req: Request, res: Response) {
    res.json(await rolesService.listRoles());
  },
  async listPermissions(_req: Request, res: Response) {
    res.json(await rolesService.listPermissions());
  },
  async getRole(req: Request, res: Response) {
    res.json(await rolesService.getRole(Number(req.params.id)));
  },
  async createRole(req: Request, res: Response) {
    res.status(201).json(await rolesService.createRole(req.body));
  },
  async updateRole(req: Request, res: Response) {
    res.json(await rolesService.updateRole(Number(req.params.id), req.body));
  },
  async setPermissions(req: Request, res: Response) {
    res.json(await rolesService.setRolePermissions(Number(req.params.id), req.body.permissionKeys));
  },
  async deleteRole(req: Request, res: Response) {
    await rolesService.deleteRole(Number(req.params.id));
    res.status(204).send();
  },
};
