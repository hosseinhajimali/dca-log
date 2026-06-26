import cron from 'node-cron';
import { fetchAndCachePrices } from './priceService';
import { prisma } from '../lib/prisma';
import { dispatchAnnouncement } from '../controllers/announcementsController';

// How often all scheduled work runs, in minutes: price refresh, DCA reminders,
// and announcements. Default is 5 minutes, which is fine for a local always-on
// database. Raise CRON_INTERVAL_MINUTES if you host on a scale-to-zero DB (e.g.
// Neon) and want the compute to suspend between runs to save cost.
function getIntervalMinutes(): number {
  const raw =
    process.env.CRON_INTERVAL_MINUTES ||
    process.env.PRICE_REFRESH_INTERVAL ||
    '5';
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 5;
}

// ─── DCA Reminder notifications ───────────────────────────────────────────────
async function checkDcaReminders(windowMinutes: number): Promise<void> {
  const now = new Date();
  // Look back over a window slightly larger than the run interval so a plan
  // that became due between runs is not missed. The duplicate check below
  // prevents firing the same reminder twice across overlapping windows.
  const windowStart = new Date(now.getTime() - windowMinutes * 60 * 1000);

  const duePlans = await prisma.dcaPlan.findMany({
    where: {
      isActive: true,
      nextPurchaseDate: {
        gte: windowStart,
        lte: now,
      },
    },
  });

  for (const plan of duePlans) {
    // Avoid duplicate notifications: skip if one already exists within the window.
    const existing = await prisma.notification.findFirst({
      where: {
        userId: plan.userId,
        type: 'DCA_REMINDER',
        createdAt: { gte: windowStart },
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

// ─── Scheduled announcements ──────────────────────────────────────────────────
async function dispatchDueAnnouncements(): Promise<void> {
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
}

// ─── Single consolidated job ──────────────────────────────────────────────────
// All database-touching work happens in one burst, then the connection goes
// idle until the next interval, letting Neon suspend the compute in between.
async function runScheduledWork(windowMinutes: number): Promise<void> {
  try {
    console.log('[Cron] Running scheduled work...');
    await fetchAndCachePrices();
    await checkDcaReminders(windowMinutes);
    await dispatchDueAnnouncements();
  } catch (err) {
    console.error('[Cron] Scheduled work error:', err);
  }
}

// ─── Start all cron jobs ──────────────────────────────────────────────────────
export function startCronJobs(): void {
  const intervalMinutes = getIntervalMinutes();
  const cronExpression = `*/${intervalMinutes} * * * *`;
  // Reminder window: interval plus a 2-minute buffer for timing drift.
  const windowMinutes = intervalMinutes + 2;

  cron.schedule(cronExpression, () => {
    void runScheduledWork(windowMinutes);
  });

  console.log(`⏰ Consolidated cron running every ${intervalMinutes} minutes`);

  // Run once on startup so prices are fresh immediately.
  void runScheduledWork(windowMinutes);
}
