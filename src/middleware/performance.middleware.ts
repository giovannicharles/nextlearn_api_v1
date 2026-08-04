import { Request, Response, NextFunction } from 'express';

/**
 * Performance monitoring middleware.
 * Adds X-Response-Time header and logs slow requests (>500ms).
 */
export const performanceMonitor = (req: Request, res: Response, next: NextFunction): void => {
  const start = process.hrtime.bigint();

  const originalEnd = res.end.bind(res);
  res.end = (...args: any[]) => {
    const durationNs = process.hrtime.bigint() - start;
    const durationMs = Number(durationNs) / 1_000_000;

    try {
      res.setHeader('X-Response-Time', `${durationMs.toFixed(2)}ms`);
    } catch {
      // Headers may already be sent in some edge cases
    }

    if (durationMs > 500) {
      console.warn(`⚠️  Slow request: ${req.method} ${req.originalUrl} - ${durationMs.toFixed(2)}ms`);
    }

    return originalEnd(...args);
  };

  next();
};
