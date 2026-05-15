import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ success: false, error: err.message });
    return;
  }

  console.error('[Server Error]', err);
  const isDev = process.env.NODE_ENV !== 'production';
  res.status(500).json({
    success: false,
    error: isDev ? String((err as Error).message ?? 'Internal server error') : 'Internal server error',
  });
}
