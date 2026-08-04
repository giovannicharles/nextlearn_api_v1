import { AppError } from './AppError';

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized', details?: any) {
    super(
      message,
      401,
      'UNAUTHORIZED',
      true,
      details
    );
  }
}
