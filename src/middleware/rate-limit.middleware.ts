import rateLimit from 'express-rate-limit';
import env from '../config/env';

/**
 * Global rate limiter — applies to all API routes.
 * Default: 100 requests per minute per IP.
 */
export const globalRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Trop de requêtes. Veuillez réessayer plus tard.',
    },
  },
});

/**
 * Auth rate limiter — stricter limits for auth endpoints.
 * Disabled in development for easier testing.
 */
export const authRateLimiter = env.NODE_ENV === 'development' 
  ? rateLimit({ windowMs: 15 * 60 * 1000, max: 1000, skip: () => true })
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      max: env.OTP_RATE_LIMIT_MAX,
      standardHeaders: true,
      legacyHeaders: false,
      validate: { xForwardedForHeader: false },
      message: {
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Trop de tentatives d\'authentification. Veuillez réessayer dans 15 minutes.',
        },
      },
    });

/**
 * OTP rate limiter — prevents OTP abuse.
 * 3 OTP requests per 10 minutes per IP.
 */
export const otpRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: {
    error: {
      code: 'OTP_RATE_LIMIT',
      message: 'Trop de demandes OTP. Veuillez patienter avant de redemander un code.',
    },
  },
});
