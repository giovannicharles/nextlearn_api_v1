import { Response } from 'express';
import { RoleService } from './role.service';
import { successResponse } from '../../shared/http/response';
import { AuthRequest } from '../../middleware/auth.guard';

export class RoleController {
  constructor(private roleService: RoleService) {}

  async listRoles(_req: AuthRequest, res: Response): Promise<void> {
    const roles = await this.roleService.listRoles();
    successResponse(res, roles);
  }

  async getRole(req: AuthRequest, res: Response): Promise<void> {
    const id = String(req.params.id);
    const role = await this.roleService.getRole(id);
    successResponse(res, role);
  }

  async createRole(req: AuthRequest, res: Response): Promise<void> {
    const role = await this.roleService.createRole(req.body);
    successResponse(res, role, 201);
  }

  async updateRole(req: AuthRequest, res: Response): Promise<void> {
    const id = String(req.params.id);
    const role = await this.roleService.updateRole(id, req.body);
    successResponse(res, role);
  }

  async deleteRole(req: AuthRequest, res: Response): Promise<void> {
    const id = String(req.params.id);
    await this.roleService.deleteRole(id);
    successResponse(res, { message: 'Rôle supprimé' });
  }

  async getPermissions(_req: AuthRequest, res: Response): Promise<void> {
    const result = await this.roleService.getPermissions();
    successResponse(res, result);
  }
}
