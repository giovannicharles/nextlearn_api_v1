import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/index';
import { errorResponse } from './response';
import { ZodError } from 'zod';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): Response => {
  console.error('❌ Error:', err);

  // Zod validation errors
  if (err instanceof ZodError) {
    return errorResponse(
      res,
      'VALIDATION_ERROR',
      'Validation failed',
      400,
      err.errors
    );
  }

  // Operational errors (AppError)
  if (err instanceof AppError) {
    return errorResponse(
      res,
      err.code,
      err.message,
      err.statusCode,
      err.details
    );
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return errorResponse(res, 'INVALID_TOKEN', 'Invalid token', 401);
  }

  if (err.name === 'TokenExpiredError') {
    return errorResponse(res, 'TOKEN_EXPIRED', 'Token expired', 401);
  }

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    return errorResponse(
      res,
      'VALIDATION_ERROR',
      'Database validation failed',
      400,
      (err as any).errors
    );
  }

  // Mongoose duplicate key error
  if ((err as any).code === 11000) {
    const field = Object.keys((err as any).keyPattern)[0];
    return errorResponse(
      res,
      'DUPLICATE_ENTRY',
      `${field} already exists`,
      409
    );
  }

  // Default error
  return errorResponse(
    res,
    'INTERNAL_ERROR',
    process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    500
  );
};
