import { Router } from 'express';
import { RoleController } from './role.controller';
import { authGuard, permissionGuard } from '../../middleware/auth.guard';

export const createRoleRoutes = (roleController: RoleController): Router => {
  const router = Router();

  router.use(authGuard);

  router.get('/permissions', permissionGuard('role:manage'), (req, res) => roleController.getPermissions(req as any, res));
  router.get('/', permissionGuard('role:manage'), (req, res) => roleController.listRoles(req as any, res));
  router.get('/:id', permissionGuard('role:manage'), (req, res) => roleController.getRole(req as any, res));
  router.post('/', permissionGuard('role:manage'), (req, res) => roleController.createRole(req as any, res));
  router.put('/:id', permissionGuard('role:manage'), (req, res) => roleController.updateRole(req as any, res));
  router.delete('/:id', permissionGuard('role:manage'), (req, res) => roleController.deleteRole(req as any, res));

  return router;
};
