import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  // Server
  PORT: z.string().default('5000').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // MongoDB — accepte MONGO_URI (v1) ou MONGODB_URI (v2)
  MONGO_URI: z.string().optional(),
  MONGODB_URI: z.string().optional(),

  // Redis (optionnel)
  REDIS_HOST: z.string().optional(),
  REDIS_PORT: z.string().default('6379').transform(Number),
  REDIS_PASSWORD: z.string().optional(),

  // JWT
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: z.string().min(1, 'CLOUDINARY_CLOUD_NAME is required'),
  CLOUDINARY_API_KEY: z.string().min(1, 'CLOUDINARY_API_KEY is required'),
  CLOUDINARY_API_SECRET: z.string().min(1, 'CLOUDINARY_API_SECRET is required'),
  CLOUDINARY_UPLOAD_PRESET: z.string().optional(),

  // Email — SendGrid ou SMTP
  SENDGRID_API_KEY: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().default('587').transform(Number),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),

  // Firebase
  FCM_PROJECT_ID: z.string().optional(),
  FCM_PRIVATE_KEY: z.string().optional(),
  FCM_CLIENT_EMAIL: z.string().optional(),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().default('60000').transform(Number),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100').transform(Number),
  OTP_RATE_LIMIT_MAX: z.string().default('5').transform(Number),

  // Upload
  MAX_FILE_SIZE: z.string().default('52428800').transform(Number),
});

const validateEnv = () => {
  try {
    const parsed = envSchema.parse(process.env);

    const mongoUri = parsed.MONGO_URI || parsed.MONGODB_URI;
    if (!mongoUri) {
      console.warn('⚠️  MONGO_URI not configured. Database features will be unavailable.');
    }

    return { ...parsed, MONGODB_URI: mongoUri || '' };
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Configuration validation failed:');
      error.errors.forEach((err) => {
        console.error(`   - ${err.path.join('.')}: ${err.message}`);
      });
      console.warn('⚠️  Starting with default values where possible...');
      return {
        PORT: Number(process.env.PORT || 5000),
        NODE_ENV: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
        MONGODB_URI: process.env.MONGO_URI || process.env.MONGODB_URI || '',
        REDIS_HOST: undefined,
        REDIS_PORT: 6379,
        REDIS_PASSWORD: undefined,
        JWT_SECRET: process.env.JWT_SECRET || 'fallback-dev-secret',
        JWT_EXPIRES_IN: '7d',
        JWT_ACCESS_EXPIRES_IN: '15m',
        JWT_REFRESH_EXPIRES_IN: '30d',
        CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
        CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
        CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',
        CLOUDINARY_UPLOAD_PRESET: undefined,
        SENDGRID_API_KEY: undefined,
        SMTP_HOST: undefined,
        SMTP_PORT: 587,
        SMTP_USER: process.env.SMTP_USER,
        SMTP_PASS: process.env.SMTP_PASS,
        FCM_PROJECT_ID: undefined,
        FCM_PRIVATE_KEY: undefined,
        FCM_CLIENT_EMAIL: undefined,
        RATE_LIMIT_WINDOW_MS: 60000,
        RATE_LIMIT_MAX_REQUESTS: 100,
        OTP_RATE_LIMIT_MAX: 5,
        MAX_FILE_SIZE: 52428800,
      };
    }
    throw error;
  }
};

export const env = validateEnv();

export default env;
