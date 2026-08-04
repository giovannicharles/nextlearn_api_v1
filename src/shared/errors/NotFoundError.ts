import { AppError } from './AppError';

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource', details?: any) {
    super(
      `${resource} not found`,
      404,
      'NOT_FOUND',
      true,
      details
    );
  }
}
