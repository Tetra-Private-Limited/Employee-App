import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { config } from '../config/index.js';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  if (config.nodeEnv === 'development') {
    console.error('Error:', err.stack);
  }

  // Prisma known errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        return res.status(409).json({
          success: false,
          error: 'A record with this value already exists',
          field: (err.meta?.target as string[])?.join(', '),
        });
      case 'P2025':
        return res.status(404).json({
          success: false,
          error: 'Record not found',
        });
      default:
        return res.status(400).json({
          success: false,
          error: 'Database error',
        });
    }
  }

  // Prisma validation errors
  if (err instanceof Prisma.PrismaClientValidationError) {
    return res.status(400).json({
      success: false,
      error: 'Invalid data provided',
    });
  }

  // Default error
  return res.status(500).json({
    success: false,
    error: config.nodeEnv === 'development' ? err.message : 'Internal server error',
  });
}
