import { PaginationMeta } from '../http/response';

export interface PaginationOptions {
  page?: number;
  limit?: number;
  defaultLimit?: number;
  maxLimit?: number;
}

export const parsePagination = (
  options: PaginationOptions = {}
): { page: number; limit: number; skip: number } => {
  const { page = 1, limit, defaultLimit = 20, maxLimit = 50 } = options;

  const parsedPage = Math.max(1, Number(page) || 1);
  const parsedLimit = Math.min(
    maxLimit,
    Math.max(1, Number(limit) || defaultLimit)
  );

  return {
    page: parsedPage,
    limit: parsedLimit,
    skip: (parsedPage - 1) * parsedLimit,
  };
};

export const createPaginationMeta = (
  page: number,
  limit: number,
  total: number
): PaginationMeta => {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
};
