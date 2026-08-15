import { Role } from '../../models/Role.model';
import { NotFoundError, ConflictError } from '../../shared/errors/index';
import { ALL_PERMISSIONS, PERMISSION_GROUPS, DEFAULT_ROLES } from '../../shared/permissions';
import { clearPermissionCache } from '../../middleware/auth.guard';

export class RoleService {
  async listRoles(): Promise<any[]> {
    return await Role.find().sort({ isSystem: -1, name: 1 }).lean();
  }

  async getRole(id: string): Promise<any> {
    const role = await Role.findById(id).lean();
    if (!role) {
      throw new NotFoundError('Rôle introuvable');
    }
    return role;
  }

  async getRoleByName(name: string): Promise<any> {
    const role = await Role.findOne({ name: name.toLowerCase() }).lean();
    if (!role) {
      throw new NotFoundError(`Rôle "${name}" introuvable`);
    }
    return role;
  }

  async createRole(data: { name: string; label: string; description?: string; permissions: string[] }): Promise<any> {
    const existing = await Role.findOne({ name: data.name.toLowerCase() });
    if (existing) {
      throw new ConflictError('Un rôle avec ce nom existe déjà');
    }

    const invalidPerms = data.permissions.filter(p => !ALL_PERMISSIONS.includes(p as any));
    if (invalidPerms.length > 0) {
      throw new Error(`Permissions invalides: ${invalidPerms.join(', ')}`);
    }

    const role = await Role.create({
      ...data,
      name: data.name.toLowerCase(),
      isSystem: false,
      isActive: true,
    });
    clearPermissionCache();
    return role;
  }

  async updateRole(id: string, data: { label?: string; description?: string; permissions?: string[]; isActive?: boolean }): Promise<any> {
    const role = await Role.findById(id);
    if (!role) {
      throw new NotFoundError('Rôle introuvable');
    }
    if (role.isSystem && data.isActive === false) {
      throw new Error('Impossible de désactiver un rôle système');
    }

    if (data.permissions) {
      const invalidPerms = data.permissions.filter(p => !ALL_PERMISSIONS.includes(p as any));
      if (invalidPerms.length > 0) {
        throw new Error(`Permissions invalides: ${invalidPerms.join(', ')}`);
      }
      role.permissions = data.permissions;
    }
    if (data.label !== undefined) role.label = data.label;
    if (data.description !== undefined) role.description = data.description;
    if (data.isActive !== undefined) role.isActive = data.isActive;

    await role.save();
    clearPermissionCache();
    return role;
  }

  async deleteRole(id: string): Promise<void> {
    const role = await Role.findById(id);
    if (!role) {
      throw new NotFoundError('Rôle introuvable');
    }
    if (role.isSystem) {
      throw new Error('Impossible de supprimer un rôle système');
    }
    await Role.deleteOne({ _id: id });
    clearPermissionCache();
  }

  async getPermissions(): Promise<any> {
    return {
      permissions: ALL_PERMISSIONS,
      groups: PERMISSION_GROUPS,
    };
  }

  async seedDefaults(): Promise<void> {
    for (const role of DEFAULT_ROLES) {
      const existing = await Role.findOne({ name: role.name });
      if (!existing) {
        await Role.create(role);
        continue;
      }

      // Les rôles système doivent suivre le catalogue de permissions : sans
      // cela, toute nouvelle permission (ex. user:create) restait absente des
      // rôles déjà en base et la route correspondante répondait 403.
      // Ajout uniquement : les permissions accordées à la main sont conservées.
      if (!existing.isSystem) continue;

      const missing = role.permissions.filter(p => !existing.permissions.includes(p));
      if (missing.length > 0) {
        existing.permissions = [...existing.permissions, ...missing];
        await existing.save();
      }
    }
    clearPermissionCache();
  }
}
