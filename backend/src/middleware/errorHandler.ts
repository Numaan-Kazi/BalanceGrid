import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) => {
  // Safe logging in server logs
  console.error('[Error Handler]', {
    path: req.path,
    method: req.method,
    message: err.message,
    statusCode: err.statusCode,
  });

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  // Handle Prisma unique constraint violation (P2002)
  if (err.code === 'P2002') {
    return res.status(409).json({
      error: 'A conflicting record already exists with these unique values.',
      fields: err.meta?.target,
    });
  }

  // Handle Prisma foreign key constraint violation (P2003)
  if (err.code === 'P2003') {
    return res.status(400).json({
      error: 'Referenced entity does not exist or cannot be modified.',
    });
  }

  // Handle Prisma record not found (P2025)
  if (err.code === 'P2025') {
    return res.status(404).json({
      error: 'Requested record was not found.',
    });
  }

  // Do not expose stack trace or database credentials
  return res.status(500).json({
    error: 'An internal server error occurred. Please try again later.',
  });
};

