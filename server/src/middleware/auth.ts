import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../types';
import { AppError } from './errorHandler';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_in_production';

export function requireAuth(req: AuthRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return next(new AppError(401, 'No token provided'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
    req.userId = payload.userId;
    next();
  } catch {
    next(new AppError(401, 'Invalid or expired token'));
  }
}

export async function requireAdmin(req: AuthRequest, _res: Response, next: NextFunction): Promise<void> {
  if (!req.userId) return next(new AppError(401, 'Not authenticated'));

  const { prisma } = await import('../lib/prisma');
  const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { isAdmin: true } });

  if (!user?.isAdmin) return next(new AppError(403, 'Admin access required'));
  next();
}

export function signToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'],
  });
}
