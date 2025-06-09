export enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  FILE_ERROR = 'FILE_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  PROCESSING_ERROR = 'PROCESSING_ERROR'
}

export class AppError extends Error {
  constructor(
    public type: ErrorType,
    public message: string,
    public statusCode: number,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static notFound(message: string = 'Resource not found'): AppError {
    return new AppError(ErrorType.NOT_FOUND, message, 404);
  }

  static validationError(message: string): AppError {
    return new AppError(ErrorType.VALIDATION_ERROR, message, 400);
  }

  static fileError(message: string): AppError {
    return new AppError(ErrorType.FILE_ERROR, message, 400);
  }

  static databaseError(message: string): AppError {
    return new AppError(ErrorType.DATABASE_ERROR, message, 500);
  }

  static processingError(message: string): AppError {
    return new AppError(ErrorType.PROCESSING_ERROR, message, 500);
  }
} 