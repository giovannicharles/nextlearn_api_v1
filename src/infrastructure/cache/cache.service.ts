import { getRedisClient } from '../../config/redis';

export class CacheService {
  private redis = getRedisClient();

  async get<T>(key: string): Promise<T | null> {
    if (!this.redis) return null;
    try {
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
    if (!this.redis) return;
    try {
      await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch {
      // Silent fail — cache is non-critical
    }
  }

  async del(key: string): Promise<void> {
    if (!this.redis) return;
    try {
      await this.redis.del(key);
    } catch {
      // Silent fail
    }
  }

  async delByPattern(pattern: string): Promise<void> {
    if (!this.redis) return;
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch {
      // Silent fail
    }
  }

  async flush(): Promise<void> {
    if (!this.redis) return;
    try {
      await this.redis.flushdb();
    } catch {
      // Silent fail
    }
  }

  generateKey(prefix: string, ...parts: (string | number)[]): string {
    return `${prefix}:${parts.join(':')}`;
  }
}

export const cacheService = new CacheService();
