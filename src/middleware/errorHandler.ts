import { Request, Response, NextFunction } from 'express';
import { AppError, ErrorType } from '../types/errors';
import multer from 'multer';
import { QueryFailedError } from 'typeorm';

// Custom error logger
const logError = (error: Error, req: Request) => {
  const timestamp = new Date().toISOString();
  const errorInfo = {
    timestamp,
    method: req.method,
    path: req.path,
    query: req.query,
    params: req.params,
    body: req.body,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...(error instanceof AppError && {
        type: error.type,
        statusCode: error.statusCode,
        details: error.details
      })
    }
  };

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error details:', JSON.stringify(errorInfo, null, 2));
  } else {
    // In production, you might want to send this to a logging service
    console.error(`[${timestamp}] ${req.method} ${req.path} - ${error.message}`);
  }
};

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log the error
  logError(err, req);

  // Handle Multer errors
  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE' 
      ? 'File size too large. Maximum size is 5MB'
      : `Upload error: ${err.message}`;

    return res.status(400).json({
      status: 'error',
      type: ErrorType.VALIDATION,
      message,
      details: [{
        field: 'file',
        message,
        value: req.file
      }]
    });
  }

  // Handle AppError instances
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: 'error',
      type: err.type,
      message: err.message,
      ...(err.details && { details: err.details }),
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  }

  // Handle TypeORM errors
  if (err instanceof QueryFailedError) {
    const message = 'Database operation failed';
    const details = process.env.NODE_ENV === 'development' 
      ? [{ field: 'database', message: err.message }]
      : undefined;

    return res.status(500).json({
      status: 'error',
      type: ErrorType.DATABASE,
      message,
      ...(details && { details })
    });
  }

  // Handle unknown errors
  return res.status(500).json({
    status: 'error',
    type: ErrorType.PROCESSING,
    message: process.env.NODE_ENV === 'development' 
      ? err.message 
      : 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      details: [{ field: 'unknown', message: err.message }]
    })
  });
}; 