import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../types';

// ─── dispatch helper — creates one notification per user ─────────────────────
export async function dispatchAnnouncement(announcementId: string): Promise<number> {
  const announcement = await prisma.announcement.findUnique({ where: { id: announcementId } });
  if (!announcement) return 0;

  const users = await prisma.user.findMany({ select: { id: true } });

  await prisma.notification.createMany({
    data: users.map(u => ({
      userId:   u.id,
      type:     'ANNOUNCEMENT' as const,
      title:    announcement.title,
      message:  announcement.message,
      metadata: { announcementId: announcement.id },
    })),
  });

  await prisma.announcement.update({
    where: { id: announcementId },
    data:  { sentAt: new Date(), sentCount: { increment: users.length } },
  });

  return users.length;
}

// ─── POST /admin/announcements ────────────────────────────────────────────────
const createSchema = z.object({
  title:       z.string().min(1).max(100),
  message:     z.string().min(1),
  scheduledAt: z.string().datetime().optional().nullable(),
});

export async function createAnnouncement(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const body = createSchema.safeParse(req.body);
    if (!body.success) { res.status(400).json({ error: body.error.flatten() }); return; }

    const { title, message, scheduledAt } = body.data;
    const schedDate = scheduledAt ? new Date(scheduledAt) : null;
    const sendNow   = !schedDate || schedDate <= new Date();

    const announcement = await prisma.announcement.create({
      data: {
        title,
        message,
        scheduledAt: schedDate,
        sentAt:      sendNow ? new Date() : null,
      },
    });

    let sentCount = 0;
    if (sendNow) {
      sentCount = await dispatchAnnouncement(announcement.id);
    }

    res.status(201).json({ success: true, data: { ...announcement, sentCount } });
  } catch (err) {
    next(err);
  }
}

// ─── GET /admin/announcements ─────────────────────────────────────────────────
export async function getAnnouncements(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const announcements = await prisma.announcement.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: announcements });
  } catch (err) {
    next(err);
  }
}

// ─── DELETE /admin/announcements/:id ─────────────────────────────────────────
export async function deleteAnnouncement(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const exists = await prisma.announcement.findUnique({ where: { id } });
    if (!exists) { res.status(404).json({ error: 'Announcement not found' }); return; }

    // Delete all notifications that were created from this announcement
    await prisma.notification.deleteMany({
      where: { metadata: { path: ['announcementId'], equals: id } },
    });

    await prisma.announcement.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

// ─── POST /admin/announcements/:id/resend ─────────────────────────────────────
export async function resendAnnouncement(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const exists = await prisma.announcement.findUnique({ where: { id } });
    if (!exists) { res.status(404).json({ error: 'Announcement not found' }); return; }

    const sentCount = await dispatchAnnouncement(id);
    const updated   = await prisma.announcement.findUnique({ where: { id } });
    res.json({ success: true, data: updated, sentCount });
  } catch (err) {
    next(err);
  }
}
