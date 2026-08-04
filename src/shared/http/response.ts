import { Response } from 'express';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  data: T;
  meta?: PaginationMeta;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

export const successResponse = <T>(
  res: Response,
  data: T,
  statusCode: number = 200,
  meta?: PaginationMeta
): Response => {
  const response: ApiResponse<T> = { data };
  if (meta) {
    response.meta = meta;
  }
  return res.status(statusCode).json(response);
};

export const errorResponse = (
  res: Response,
  code: string,
  message: string,
  statusCode: number = 500,
  details?: any
): Response => {
  const response: ApiError = {
    error: { code, message, details },
  };
  return res.status(statusCode).json(response);
};
