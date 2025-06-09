import { Request, Response, NextFunction } from 'express';
import { AppError, ErrorType } from '../types/errors';
import multer from 'multer';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Handle Multer errors
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        status: 'error',
        type: ErrorType.VALIDATION_ERROR,
        message: 'File size too large. Maximum size is 5MB'
      });
    }
    return res.status(400).json({
      status: 'error',
      type: ErrorType.VALIDATION_ERROR,
      message: `Upload error: ${err.message}`
    });
  }

  // Handle AppError instances
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: 'error',
      type: err.type,
      message: err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  }

  // Handle TypeORM errors
  if (err.name === 'QueryFailedError') {
    return res.status(500).json({
      status: 'error',
      type: ErrorType.DATABASE_ERROR,
      message: 'Database operation failed',
      ...(process.env.NODE_ENV === 'development' && { details: err.message })
    });
  }

  // Handle unknown errors
  console.error('Unhandled error:', err);
  return res.status(500).json({
    status: 'error',
    type: ErrorType.PROCESSING_ERROR,
    message: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}; 