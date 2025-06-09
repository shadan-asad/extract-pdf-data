import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import { AppError, ValidationErrorDetail } from '../types/errors';

export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    // Convert validation errors to our format
    const details: ValidationErrorDetail[] = errors.array().map(error => ({
      field: error.type === 'field' ? error.path : 'unknown',
      message: error.msg,
      value: error.value
    }));

    throw AppError.validationError('Validation failed', details);
  };
};

// Common validation chains
export const commonValidations = {
  id: (paramName: string = 'id') => {
    return {
      param: (req: Request, res: Response, next: NextFunction) => {
        const id = parseInt(req.params[paramName]);
        if (isNaN(id) || id <= 0) {
          throw AppError.validationError('Invalid ID', [{
            field: paramName,
            message: 'ID must be a positive number',
            value: req.params[paramName]
          }]);
        }
        next();
      }
    };
  },

  pagination: (req: Request, res: Response, next: NextFunction) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    if (page < 1 || limit < 1 || limit > 100) {
      throw AppError.validationError('Invalid pagination parameters', [{
        field: 'pagination',
        message: 'Page must be >= 1 and limit must be between 1 and 100',
        value: { page, limit }
      }]);
    }
    next();
  }
}; 