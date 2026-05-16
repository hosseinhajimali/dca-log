import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../types';

// ─── GET /notifications ───────────────────────────────────────────────────────
export async function getNotifications(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId!;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = prisma as any;
    if (!db.notification) {
      res.json({ success: true, data: { notifications: [], unreadCount: 0 } });
      return;
    }
    const notifications = await db.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const unreadCount = await db.notification.count({ where: { userId, isRead: false } });
    res.json({ success: true, data: { notifications, unreadCount } });
  } catch (err) {
    next(err);
  }
}

// ─── PATCH /notifications/:id/read ───────────────────────────────────────────
export async function markAsRead(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    await prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

// ─── PATCH /notifications/read-all ───────────────────────────────────────────
export async function markAllAsRead(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId!;
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

// ─── DELETE /notifications/:id ────────────────────────────────────────────────
export async function deleteNotification(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    await prisma.notification.deleteMany({ where: { id, userId } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

// ─── DELETE /notifications (clear all) ───────────────────────────────────────
export async function clearAllNotifications(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId!;
    await prisma.notification.deleteMany({ where: { userId } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
