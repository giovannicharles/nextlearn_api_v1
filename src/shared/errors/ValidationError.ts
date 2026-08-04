import { AppError } from './AppError';

export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', details?: any) {
    super(
      message,
      400,
      'VALIDATION_ERROR',
      true,
      details
    );
  }
}
