import { Router } from 'express';
import { SettingController } from './setting.controller';
import { authGuard, permissionGuard } from '../../middleware/auth.guard';

export const createSettingRoutes = (settingController: SettingController): Router => {
  const router = Router();

  // Public settings (no auth needed)
  router.get('/public', (_req, res) => settingController.getPublicSettings(_req as any, res));
  router.get('/categories', authGuard, permissionGuard('setting:read'), (_req, res) => settingController.getCategories(_req as any, res));

  // Admin-only routes
  router.get('/', authGuard, permissionGuard('setting:read'), (req, res) => settingController.listSettings(req as any, res));
  router.get('/:key', authGuard, permissionGuard('setting:read'), (req, res) => settingController.getSetting(req as any, res));
  router.post('/', authGuard, permissionGuard('setting:manage'), (req, res) => settingController.createSetting(req as any, res));
  router.put('/:key', authGuard, permissionGuard('setting:manage'), (req, res) => settingController.updateSetting(req as any, res));
  router.post('/:key/reset', authGuard, permissionGuard('setting:manage'), (req, res) => settingController.resetSetting(req as any, res));
  router.delete('/:key', authGuard, permissionGuard('setting:manage'), (req, res) => settingController.deleteSetting(req as any, res));

  return router;
};
