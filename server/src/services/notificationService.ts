import { prisma } from '../lib/prisma';

type NotifType = 'DCA_REMINDER' | 'SELL_RULE_MET' | 'BUYING_RULE_MET';

// Creates a notification only if one of the same type+plan hasn't been created today.
// This prevents spamming the same notification on every page load.
export async function maybeNotify(
  userId: string,
  type: NotifType,
  title: string,
  message: string,
  metadata?: Record<string, unknown>,
) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = prisma as any;
  if (!db.notification) return; // table not yet migrated

  const existing = await db.notification.findFirst({
    where: {
      userId,
      type,
      metadata: metadata ? { equals: metadata as object } : undefined,
      createdAt: { gte: startOfDay },
    },
  });

  if (existing) return; // already notified today

  await db.notification.create({
    data: { userId, type, title, message, metadata: metadata as object },
  });
}
