import { DcaFrequency } from '@prisma/client';

export function computeNextPurchaseDate(
  from: Date,
  frequency: DcaFrequency,
  intervalDays?: number | null
): Date {
  const next = new Date(from);
  const now = new Date();

  // If start is in the future, that IS the next purchase date
  if (next > now) return next;

  // Otherwise advance until it's in the future
  while (next <= now) {
    switch (frequency) {
      case 'DAILY':
        next.setDate(next.getDate() + 1);
        break;
      case 'WEEKLY':
        next.setDate(next.getDate() + 7);
        break;
      case 'BIWEEKLY':
        next.setDate(next.getDate() + 14);
        break;
      case 'MONTHLY':
        next.setMonth(next.getMonth() + 1);
        break;
      case 'CUSTOM':
        next.setDate(next.getDate() + (intervalDays ?? 30));
        break;
    }
  }

  return next;
}
