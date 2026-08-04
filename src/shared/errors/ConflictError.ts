import { AppError } from './AppError';

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict', details?: any) {
    super(
      message,
      409,
      'CONFLICT',
      true,
      details
    );
  }
}
