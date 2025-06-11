export enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND_ERROR',
  FILE = 'FILE_ERROR',
  DATABASE = 'DATABASE_ERROR',
  PROCESSING = 'PROCESSING_ERROR'
}

export interface ValidationErrorDetail {
  field: string;
  message: string;
  value?: any;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly type: ErrorType;
  public readonly details?: ValidationErrorDetail[];

  constructor(message: string, statusCode: number, type: ErrorType, details?: ValidationErrorDetail[]) {
    super(message);
    this.statusCode = statusCode;
    this.type = type;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static validationError(message: string, details?: ValidationErrorDetail[]): AppError {
    return new AppError(message, 400, ErrorType.VALIDATION, details);
  }

  static notFoundError(message: string): AppError {
    return new AppError(message, 404, ErrorType.NOT_FOUND);
  }

  static fileError(message: string): AppError {
    return new AppError(message, 400, ErrorType.FILE);
  }

  static databaseError(message: string): AppError {
    return new AppError(message, 500, ErrorType.DATABASE);
  }

  static processingError(message: string): AppError {
    return new AppError(message, 500, ErrorType.PROCESSING);
  }
} 