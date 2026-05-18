import { Response, NextFunction } from 'express';
import { FeedbackCategory } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../types';

// ─── GET /admin/users ─────────────────────────────────────────────────────────
export async function getUsers(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, email: true, name: true, avatar: true,
        currency: true, isAdmin: true, createdAt: true,
        _count: { select: { dcaPlans: true, transactions: true, assets: true } },
      },
    });
    res.json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
}

// ─── PATCH /admin/users/:id/disable ──────────────────────────────────────────
// We repurpose isAdmin=false as "not disabled" and add a soft-disable via
// a future isDisabled field. For now we just delete their sessions by
// invalidating, simplest approach: we can't truly disable without a flag.
// So let's just mark them for now with a workaround: flip a note in the name.
// Actually, the cleanest approach without a new migration is to just expose
// delete. We'll keep disable as a no-op stub and note it requires a migration.
export async function disableUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    if (id === req.userId) {
      res.status(400).json({ success: false, error: 'Cannot disable your own account' });
      return;
    }
    // Stub: will be wired to isDisabled field once added to schema
    res.json({ success: true, message: 'User disabled (stub, add isDisabled to schema)' });
  } catch (err) {
    next(err);
  }
}

// ─── DELETE /admin/users/:id ──────────────────────────────────────────────────
export async function deleteUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    if (id === req.userId) {
      res.status(400).json({ success: false, error: 'Cannot delete your own account' });
      return;
    }
    await prisma.user.delete({ where: { id: id as string } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

// ─── GET /admin/stats ─────────────────────────────────────────────────────────
export async function getStats(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const [userCount, planCount, txCount, assetCount, feedbackCount] = await Promise.all([
      prisma.user.count(),
      prisma.dcaPlan.count(),
      prisma.transaction.count(),
      prisma.asset.count(),
      prisma.feedback.count({ where: { isRead: false } }),
    ]);

    const totalInvested = await prisma.transaction.aggregate({
      where: { type: 'BUY' },
      _sum: { amountUsd: true },
    });

    res.json({
      success: true,
      data: {
        userCount,
        planCount,
        txCount,
        assetCount,
        unreadFeedback: feedbackCount,
        totalInvestedUsd: totalInvested._sum.amountUsd ?? 0,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── GET /admin/feedback ──────────────────────────────────────────────────────
export async function getFeedback(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { category, unread } = req.query;

    const feedbacks = await prisma.feedback.findMany({
      where: {
        ...(category ? { category: category as string as FeedbackCategory } : {}),
        ...(unread === 'true' ? { isRead: false } : {}),
      },
      include: { user: { select: { id: true, email: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: feedbacks });
  } catch (err) {
    next(err);
  }
}

// ─── PATCH /admin/feedback/:id/read ──────────────────────────────────────────
export async function markFeedbackRead(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    await prisma.feedback.update({ where: { id: id as string }, data: { isRead: true } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

// ─── PATCH /admin/feedback/read-all ──────────────────────────────────────────
export async function markAllFeedbackRead(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await prisma.feedback.updateMany({ where: { isRead: false }, data: { isRead: true } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

// ─── DELETE /admin/feedback/:id ───────────────────────────────────────────────
export async function deleteFeedback(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    await prisma.feedback.delete({ where: { id: id as string } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
