import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../types';
import { AppError } from '../middleware/errorHandler';

const feedbackSchema = z.object({
  category: z.enum(['COMPLAINT', 'FEEDBACK', 'LOGIN_ISSUE', 'APP_ISSUE', 'FEATURE_REQUEST', 'OTHER']),
  message: z.string().min(10, 'Message must be at least 10 characters').max(2000),
});

// ─── POST /feedback ───────────────────────────────────────────────────────────
export async function createFeedback(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const body = feedbackSchema.safeParse(req.body);
    if (!body.success) return next(new AppError(400, body.error.errors[0].message));

    const feedback = await prisma.feedback.create({
      data: {
        userId: req.userId ?? null,
        category: body.data.category,
        message: body.data.message,
      },
    });

    res.status(201).json({ success: true, data: feedback });
  } catch (err) {
    next(err);
  }
}
