import { Request, Response, NextFunction } from 'express';
import { cacheService } from '../infrastructure/cache/cache.service';

/**
 * Cache middleware for GET requests.
 * Caches the response based on the URL path + query string.
 * Automatically invalidates when a matching tag is flushed.
 *
 * Usage:
 *   router.get('/', cache('documents', 300), controller.list);
 */
export const cache = (prefix: string, ttlSeconds: number = 300) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (req.method !== 'GET') return next();

    const userId = (req as any).user?.id || 'public';
    const queryString = new URLSearchParams(req.query as any).toString();
    const key = cacheService.generateKey(prefix, userId, req.path, queryString);

    const cached = await cacheService.get(key);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      (res as any).json(cached);
      return;
    }

    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      if (res.statusCode === 200 && body) {
        cacheService.set(key, body, ttlSeconds);
      }
      res.setHeader('X-Cache', 'MISS');
      return originalJson(body);
    };

    next();
  };
};

/**
 * Invalidate cache entries matching a prefix pattern.
 * Usage: await invalidateCache('documents');
 */
export const invalidateCache = async (prefix: string): Promise<void> => {
  await cacheService.delByPattern(`${prefix}:*`);
};
