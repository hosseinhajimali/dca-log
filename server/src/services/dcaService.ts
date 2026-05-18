import { DcaFrequency } from '@prisma/client';

export function applyScheduledTime(date: Date, scheduledTime: string): Date {
  const [hours, minutes] = scheduledTime.split(':').map(Number);
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

export function computeNextPurchaseDate(
  from: Date,
  frequency: DcaFrequency,
  intervalDays?: number | null,
  scheduledTime?: string | null
): Date {
  const time = scheduledTime ?? '08:00';
  const next = new Date(from);

  // Apply the scheduled time to the start date
  applyScheduledTime(next, time);
  next.setHours(parseInt(time.split(':')[0]), parseInt(time.split(':')[1]), 0, 0);

  const now = new Date();

  // If start (with time) is in the future, that IS the next purchase date
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
