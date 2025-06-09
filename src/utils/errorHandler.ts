export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const handleError = (error: Error) => {
  if (error instanceof AppError) {
    return {
      status: 'error',
      statusCode: error.statusCode,
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    };
  }

  // Programming or unknown errors
  console.error('ERROR 💥', error);
  return {
    status: 'error',
    statusCode: 500,
    message: 'Something went wrong!',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  };
}; 