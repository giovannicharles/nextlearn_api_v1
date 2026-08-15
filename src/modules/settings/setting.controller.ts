import { Response } from 'express';
import { SettingService } from './setting.service';
import { successResponse } from '../../shared/http/response';
import { AuthRequest } from '../../middleware/auth.guard';

export class SettingController {
  constructor(private settingService: SettingService) {}

  async listSettings(req: AuthRequest, res: Response): Promise<void> {
    const includePrivate = req.user?.role === 'admin' || req.user?.permissions?.includes('setting:manage');
    const category = req.query.category as string;
    const settings = category
      ? await this.settingService.getSettingsByCategory(category)
      : await this.settingService.getAllSettings(includePrivate);
    successResponse(res, settings);
  }

  async getSetting(req: AuthRequest, res: Response): Promise<void> {
    const key = String(req.params.key);
    const setting = await this.settingService.getSetting(key);
    successResponse(res, setting);
  }

  async createSetting(req: AuthRequest, res: Response): Promise<void> {
    const setting = await this.settingService.createSetting(req.body);
    successResponse(res, setting, 201);
  }

  async updateSetting(req: AuthRequest, res: Response): Promise<void> {
    const key = String(req.params.key);
    const setting = await this.settingService.updateSetting(key, req.body.value);
    successResponse(res, setting);
  }

  async deleteSetting(req: AuthRequest, res: Response): Promise<void> {
    const key = String(req.params.key);
    await this.settingService.deleteSetting(key);
    successResponse(res, { message: 'Paramètre supprimé' });
  }

  async resetSetting(req: AuthRequest, res: Response): Promise<void> {
    const key = String(req.params.key);
    const setting = await this.settingService.resetSetting(key);
    successResponse(res, setting);
  }

  async getCategories(_req: AuthRequest, res: Response): Promise<void> {
    const categories = await this.settingService.getCategories();
    successResponse(res, categories);
  }

  async getPublicSettings(_req: AuthRequest, res: Response): Promise<void> {
    const settings = await this.settingService.getAllSettings(false);
    const result: Record<string, any> = {};
    settings.forEach(s => { result[s.key] = s.value; });
    successResponse(res, result);
  }
}
