import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { signToken } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const body = registerSchema.safeParse(req.body);
    if (!body.success) {
      return next(new AppError(400, body.error.errors[0].message));
    }

    const { email, password, name } = body.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return next(new AppError(409, 'Email already registered'));

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, passwordHash, name },
      select: { id: true, email: true, name: true, currency: true, avatar: true, theme: true, isAdmin: true, monthlyDisposableIncome: true, createdAt: true },
    });

    const token = signToken(user.id);
    res.status(201).json({ success: true, data: { user, token } });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const body = loginSchema.safeParse(req.body);
    if (!body.success) {
      return next(new AppError(400, body.error.errors[0].message));
    }

    const { email, password } = body.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return next(new AppError(401, 'Invalid credentials'));

    if (!user.passwordHash) {
      return next(new AppError(401, 'This account uses Google sign-in. Please continue with Google.'));
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return next(new AppError(401, 'Invalid credentials'));

    const token = signToken(user.id);
    const { passwordHash: _, googleId: __, ...safeUser } = user;
    res.json({ success: true, data: { user: safeUser, token } });
  } catch (err) {
    next(err);
  }
}

export async function getMe(req: Request & { userId?: string }, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, email: true, name: true, currency: true, avatar: true, theme: true, isAdmin: true, monthlyDisposableIncome: true, createdAt: true },
    });
    if (!user) return next(new AppError(404, 'User not found'));
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

export async function updateMe(req: Request & { userId?: string }, res: Response, next: NextFunction) {
  try {
    const schema = z.object({
      name: z.string().optional(),
      currency: z.string().length(3).optional(),
      avatar: z.string().optional().nullable(),
      theme: z.enum(['light', 'dark', 'system']).optional(),
      monthlyDisposableIncome: z.number().positive().optional().nullable(),
    });

    const body = schema.safeParse(req.body);
    if (!body.success) return next(new AppError(400, body.error.errors[0].message));

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: body.data,
      select: { id: true, email: true, name: true, currency: true, avatar: true, theme: true, isAdmin: true, monthlyDisposableIncome: true, updatedAt: true },
    });
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

export async function changePassword(req: Request & { userId?: string }, res: Response, next: NextFunction) {
  try {
    const schema = z.object({
      currentPassword: z.string().min(1, 'Current password is required'),
      newPassword: z.string().min(8, 'New password must be at least 8 characters'),
    });

    const body = schema.safeParse(req.body);
    if (!body.success) return next(new AppError(400, body.error.errors[0].message));

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return next(new AppError(404, 'User not found'));

    if (!user.passwordHash) {
      return next(new AppError(400, 'Your account uses Google sign-in and has no password.'));
    }

    const valid = await bcrypt.compare(body.data.currentPassword, user.passwordHash);
    if (!valid) return next(new AppError(400, 'Current password is incorrect'));

    const passwordHash = await bcrypt.hash(body.data.newPassword, 12);
    await prisma.user.update({ where: { id: req.userId }, data: { passwordHash } });

    res.json({ success: true, message: 'Password updated' });
  } catch (err) {
    next(err);
  }
}
