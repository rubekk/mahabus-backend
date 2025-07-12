import { Request, Response, NextFunction } from 'express';
import { AppError } from '@/utils/errors';
import { errorResponse } from '@/utils/response';
import config from '@/config';

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', error);

  if (error instanceof AppError) {
    return res.status(error.statusCode).json(
      errorResponse(error.message, (error as any).errors)
    );
  }

  // Handle Prisma errors
  if (error.name === 'PrismaClientKnownRequestError') {
    const prismaError = error as any;
    
    switch (prismaError.code) {
      case 'P2002':
        return res.status(409).json(
          errorResponse('Duplicate entry. This record already exists.')
        );
      case 'P2025':
        return res.status(404).json(
          errorResponse('Record not found.')
        );
      case 'P2003':
        return res.status(400).json(
          errorResponse('Foreign key constraint failed.')
        );
      default:
        return res.status(400).json(
          errorResponse('Database error occurred.')
        );
    }
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json(
      errorResponse('Invalid token.')
    );
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json(
      errorResponse('Token expired.')
    );
  }

  // Default error
  const statusCode = 500;
  const message = config.nodeEnv === 'production' 
    ? 'Internal server error' 
    : error.message;

  return res.status(statusCode).json(
    errorResponse(message)
  );
};

export const notFoundHandler = (req: Request, res: Response) => {
  return res.status(404).json(
    errorResponse(`Route ${req.originalUrl} not found`)
  );
};
