import cron from 'node-cron';
import { fetchAndCachePrices } from './priceService';
import { prisma } from '../lib/prisma';
import { dispatchAnnouncement } from '../controllers/announcementsController';

// ─── DCA Reminder notifications ───────────────────────────────────────────────
async function checkDcaReminders(): Promise<void> {
  const now = new Date();
  const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);

  const duePlans = await prisma.dcaPlan.findMany({
    where: {
      isActive: true,
      nextPurchaseDate: {
        gte: oneMinuteAgo,
        lte: now,
      },
    },
  });

  for (const plan of duePlans) {
    // Avoid duplicate notifications (check if one already exists in the last 5 min)
    const existing = await prisma.notification.findFirst({
      where: {
        userId: plan.userId,
        type: 'DCA_REMINDER',
        createdAt: { gte: new Date(now.getTime() - 5 * 60 * 1000) },
        metadata: { path: ['planId'], equals: plan.id },
      },
    });

    if (!existing) {
      const planName = plan.name || 'your DCA plan';
      await prisma.notification.create({
        data: {
          userId: plan.userId,
          type: 'DCA_REMINDER',
          title: 'DCA Reminder',
          message: `Time to make your scheduled purchase for "${planName}".`,
          metadata: { planId: plan.id },
        },
      });
      console.log(`[Cron] DCA reminder sent for plan ${plan.id}`);
    }
  }
}

// ─── Start all cron jobs ──────────────────────────────────────────────────────
export function startCronJobs(): void {
  const intervalMinutes = parseInt(process.env.PRICE_REFRESH_INTERVAL || '5', 10);
  const cronExpression = `*/${intervalMinutes} * * * *`;

  // Price refresh
  cron.schedule(cronExpression, async () => {
    console.log(`[Cron] Refreshing prices...`);
    await fetchAndCachePrices();
  });

  // DCA reminders — run every minute
  cron.schedule('* * * * *', async () => {
    await checkDcaReminders().catch(err =>
      console.error('[Cron] DCA reminder error:', err)
    );
  });

  // Scheduled announcements — run every minute
  cron.schedule('* * * * *', async () => {
    try {
      const due = await prisma.announcement.findMany({
        where: {
          sentAt:      null,
          scheduledAt: { lte: new Date() },
        },
      });
      for (const a of due) {
        const count = await dispatchAnnouncement(a.id);
        console.log(`[Cron] Announcement "${a.title}" sent to ${count} users`);
      }
    } catch (err) {
      console.error('[Cron] Announcement error:', err);
    }
  });

  console.log(`⏰ Price refresh cron running every ${intervalMinutes} minutes`);
  console.log(`⏰ DCA reminder cron running every minute`);

  // Fetch prices immediately on startup
  fetchAndCachePrices().catch(console.error);
}
