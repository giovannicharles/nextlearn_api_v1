import { Request, Response, NextFunction } from 'express';
import { Setting } from '../models/Setting.model';

let maintenanceCache: { value: boolean; expiry: number } | null = null;
const CACHE_TTL = 30_000;

async function isMaintenanceMode(): Promise<boolean> {
  const now = Date.now();
  if (maintenanceCache && maintenanceCache.expiry > now) {
    return maintenanceCache.value;
  }

  const setting = await Setting.findOne({ key: 'maintenance_mode' }).lean();
  const value = setting?.value === true;
  maintenanceCache = { value, expiry: now + CACHE_TTL };
  return value;
}

export function clearMaintenanceCache(): void {
  maintenanceCache = null;
}

export const maintenanceGuard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const path = req.path;

  // Always allow health, root, docs, settings/public, and auth routes
  const bypassPrefixes = ['/health', '/api-docs', '/api/settings/public', '/api/auth'];
  if (bypassPrefixes.some(p => path === p || path.startsWith(p + '/') || path.startsWith(p))) {
    console.log(`[Maintenance] Bypassing for path: ${path}`);
    return next();
  }

  try {
    const maintenance = await isMaintenanceMode();
    console.log(`[Maintenance] Path: ${path}, Maintenance mode: ${maintenance}`);
    if (!maintenance) {
      return next();
    }

    // Allow admins to bypass maintenance
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      // Admins can still access - let authGuard handle it
      return next();
    }

    res.status(503).json({
      error: {
        code: 'MAINTENANCE_MODE',
        message: 'L\'application est actuellement en maintenance. Veuillez réessayer plus tard.',
      },
    });
  } catch (error) {
    console.error('[Maintenance] Error checking maintenance mode:', error);
    // If we can't check, allow the request
    next();
  }
};
