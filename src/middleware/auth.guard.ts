import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UnauthorizedError, ForbiddenError } from '../shared/errors/index';
import env from '../config/env';
import { Role } from '../models/Role.model';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
    permissions?: string[];
  };
}

export const authGuard = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Token manquant');
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as { id: string; role?: string };
    req.user = { id: decoded.id, role: (decoded.role || 'user').toLowerCase() };
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Token expiré');
    }
    throw new UnauthorizedError('Token invalide');
  }
};

const roleCache = new Map<string, { permissions: string[]; expiry: number }>();
const CACHE_TTL = 60_000;

async function getUserPermissions(roleName: string): Promise<string[]> {
  const normalized = roleName.toLowerCase();
  const now = Date.now();
  const cached = roleCache.get(normalized);
  if (cached && cached.expiry > now) {
    return cached.permissions;
  }

  let role = await Role.findOne({ name: normalized, isActive: true }).lean();

  if (!role) {
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
    const canonical = aliasMap[normalized] || 'user';
    if (canonical !== normalized) {
      role = await Role.findOne({ name: canonical, isActive: true }).lean();
    }
  }

  const permissions = role?.permissions || [];

  roleCache.set(normalized, { permissions, expiry: now + CACHE_TTL });
  return permissions;
}

export function clearPermissionCache(): void {
  roleCache.clear();
}

export function permissionGuard(requiredPermission: string) {
  return async (req: AuthRequest, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      throw new UnauthorizedError('Authentification requise');
    }

    const rolePermissions = await getUserPermissions(req.user.role);
    const allPermissions = new Set([...rolePermissions, ...(req.user.permissions || [])]);

    if (!allPermissions.has(requiredPermission)) {
      throw new ForbiddenError(`Permission requise: ${requiredPermission}`);
    }

    next();
  };
}

export const adminGuard = async (req: AuthRequest, _res: Response, next: NextFunction): Promise<void> => {
  if (!req.user) {
    throw new UnauthorizedError('Authentification requise');
  }

  const rolePermissions = await getUserPermissions(req.user.role);
  const allPermissions = new Set([...rolePermissions, ...(req.user.permissions || [])]);

  if (!allPermissions.has('admin:access')) {
    throw new ForbiddenError('Accès réservé aux administrateurs');
  }

  next();
};
