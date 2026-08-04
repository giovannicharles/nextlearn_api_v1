import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  // Server
  PORT: z.string().default('5000').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // MongoDB
  MONGODB_URI: z.string().url('Invalid MongoDB URI'),

  // Redis (optionnel)
  REDIS_HOST: z.string().optional(),
  REDIS_PORT: z.string().default('6379').transform(Number),
  REDIS_PASSWORD: z.string().optional(),

  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: z.string().min(1, 'CLOUDINARY_CLOUD_NAME is required'),
  CLOUDINARY_API_KEY: z.string().min(1, 'CLOUDINARY_API_KEY is required'),
  CLOUDINARY_API_SECRET: z.string().min(1, 'CLOUDINARY_API_SECRET is required'),
  CLOUDINARY_UPLOAD_PRESET: z.string().optional(),

  // Email
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
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Configuration validation failed:');
      error.errors.forEach((err) => {
        console.error(`   - ${err.path.join('.')}: ${err.message}`);
      });
      throw new Error('Environment configuration is invalid. Check .env file.');
    }
    throw error;
  }
};

export const env = validateEnv();

export default env;
