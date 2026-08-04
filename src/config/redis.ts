import Redis from 'ioredis';
import env from './env';

let redisClient: Redis | null = null;

export const connectRedis = (): Redis => {
  if (redisClient) {
    return redisClient;
  }

  if (!env.REDIS_HOST) {
    console.warn('⚠️  Redis not configured (REDIS_HOST missing). Running without Redis.');
    return null as any;
  }

  try {
    redisClient = new Redis({
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      password: env.REDIS_PASSWORD,
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => {
        if (times > 3) {
          console.error('❌ Redis connection failed after 3 retries');
          return null;
        }
        return Math.min(times * 100, 3000);
      },
    });

    redisClient.on('connect', () => {
      console.log('✅ Redis connected');
    });

    redisClient.on('error', (err: Error) => {
      console.error('❌ Redis error:', err.message);
    });

    redisClient.on('close', () => {
      console.log('⚠️  Redis connection closed');
    });

    return redisClient;
  } catch (error) {
    console.error('❌ Redis initialization failed:', error instanceof Error ? error.message : error);
    return null as any;
  }
};

export const disconnectRedis = async (): Promise<void> => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    console.log('✅ Redis disconnected');
  }
};

export const getRedisClient = (): Redis | null => {
  return redisClient;
};
