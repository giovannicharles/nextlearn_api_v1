import { Setting } from '../../models/Setting.model';
import { NotFoundError, ValidationError } from '../../shared/errors/index';
import { DEFAULT_SETTINGS, DEFAULT_ROLES } from '../../shared/permissions';
import { Role } from '../../models/Role.model';
import { clearPermissionCache } from '../../middleware/auth.guard';
import { clearMaintenanceCache } from '../../middleware/maintenance.middleware';

const SETTING_CACHE = new Map<string, { value: any; expiry: number }>();
const SETTING_CACHE_TTL = 30_000;

function validateSettingType(value: any, type: string): boolean {
  switch (type) {
    case 'string': return typeof value === 'string';
    case 'number': return typeof value === 'number' && !isNaN(value);
    case 'boolean': return typeof value === 'boolean';
    case 'array': return Array.isArray(value);
    case 'object': return typeof value === 'object' && value !== null && !Array.isArray(value);
    default: return false;
  }
}

export class SettingService {
  private cache = SETTING_CACHE;

  private invalidateCache(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  async getAllSettings(includePrivate = false): Promise<any[]> {
    const filter = includePrivate ? {} : { isPublic: true };
    return await Setting.find(filter).sort({ category: 1, key: 1 }).lean();
  }

  async getSettingsByCategory(category: string): Promise<any[]> {
    return await Setting.find({ category }).sort({ key: 1 }).lean();
  }

  async getSetting(key: string): Promise<any> {
    const setting = await Setting.findOne({ key }).lean();
    if (!setting) {
      throw new NotFoundError(`Paramètre "${key}" introuvable`);
    }
    return setting;
  }

  async getSettingValue<T = any>(key: string, defaultValue?: T): Promise<T> {
    const now = Date.now();
    const cached = this.cache.get(key);
    if (cached && cached.expiry > now) {
      return cached.value as T;
    }

    const setting = await Setting.findOne({ key }).lean();
    if (!setting) {
      return defaultValue as T;
    }
    this.cache.set(key, { value: setting.value, expiry: now + SETTING_CACHE_TTL });
    return setting.value as T;
  }

  async updateSetting(key: string, value: any): Promise<any> {
    const existing = await Setting.findOne({ key }).lean();
    if (!existing) {
      throw new NotFoundError(`Paramètre "${key}" introuvable`);
    }

    if (!validateSettingType(value, existing.type)) {
      throw new ValidationError(`Type invalide: attendu "${existing.type}" pour "${key}"`);
    }

    const setting = await Setting.findOneAndUpdate(
      { key },
      { value },
      { new: true, runValidators: true }
    );
    this.invalidateCache(key);
    if (key === 'maintenance_mode') clearMaintenanceCache();
    return setting;
  }

  async createSetting(data: { key: string; value: any; type: string; category: string; description?: string; isPublic?: boolean }): Promise<any> {
    const existing = await Setting.findOne({ key: data.key });
    if (existing) {
      throw new ValidationError(`Le paramètre "${data.key}" existe déjà`);
    }
    if (!validateSettingType(data.value, data.type)) {
      throw new ValidationError(`Type invalide: la valeur ne correspond pas au type "${data.type}"`);
    }
    const setting = await Setting.create(data);
    this.invalidateCache(data.key);
    return setting;
  }

  async deleteSetting(key: string): Promise<void> {
    const setting = await Setting.findOne({ key });
    if (!setting) {
      throw new NotFoundError(`Paramètre "${key}" introuvable`);
    }
    await Setting.deleteOne({ key });
    this.invalidateCache(key);
    if (key === 'maintenance_mode') clearMaintenanceCache();
  }

  async resetSetting(key: string): Promise<any> {
    const defaultSetting = DEFAULT_SETTINGS.find(s => s.key === key);
    if (!defaultSetting) {
      throw new NotFoundError(`Aucune valeur par défaut pour "${key}"`);
    }
    const setting = await Setting.findOneAndUpdate(
      { key },
      { value: defaultSetting.value },
      { new: true }
    );
    this.invalidateCache(key);
    if (key === 'maintenance_mode') clearMaintenanceCache();
    return setting;
  }

  async getCategories(): Promise<string[]> {
    const categories = await Setting.distinct('category');
    return categories.sort();
  }

  async getEmailDomains(): Promise<string[]> {
    const restrict = await this.getSettingValue<boolean>('restrict_email_domains', false);
    if (!restrict) {
      return [];
    }
    return await this.getSettingValue<string[]>('allowed_email_domains', []);
  }

  async isEmailDomainAllowed(email: string): Promise<boolean> {
    const restrict = await this.getSettingValue<boolean>('restrict_email_domains', false);
    if (!restrict) {
      return true;
    }
    const domains = await this.getSettingValue<string[]>('allowed_email_domains', []);
    if (domains.length === 0) {
      return true;
    }
    const emailDomain = email.split('@')[1]?.toLowerCase();
    return domains.some(d => d.toLowerCase() === emailDomain);
  }

  async seedDefaults(): Promise<void> {
    for (const setting of DEFAULT_SETTINGS) {
      const existing = await Setting.findOne({ key: setting.key });
      if (!existing) {
        await Setting.create(setting);
      }
    }

    for (const role of DEFAULT_ROLES) {
      const existing = await Role.findOne({ name: role.name });
      if (!existing) {
        await Role.create(role);
      }
    }

    clearPermissionCache();

    await this.normalizeUserRoles();
  }

  private async normalizeUserRoles(): Promise<void> {
    const { User } = await import('../../models/index');
    const aliasMap: Record<string, string> = {
      'admin': 'admin',
      'administrator': 'admin',
      'mod': 'moderator',
      'moderator': 'moderator',
      'user': 'user',
      'student': 'user',
      'etudiant': 'user',
      'parent': 'user',
      'conseiller': 'user',
      'mentor': 'user',
    };

    const users = await User.find({}).select('_id role').lean();
    const updates: Promise<any>[] = [];

    for (const u of users) {
      const current = (u.role || 'user').toLowerCase();
      const canonical = aliasMap[current] || 'user';
      if (current !== canonical) {
        updates.push(User.updateOne({ _id: u._id }, { $set: { role: canonical } }));
      }
    }

    if (updates.length > 0) {
      await Promise.all(updates);
      console.log(`✅ Normalized ${updates.length} user roles`);
    }
  }
}
