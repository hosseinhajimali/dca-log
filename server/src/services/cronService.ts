import cron from 'node-cron';
import { fetchAndCachePrices } from './priceService';

export function startCronJobs(): void {
  const intervalMinutes = parseInt(process.env.PRICE_REFRESH_INTERVAL || '5', 10);
  const cronExpression = `*/${intervalMinutes} * * * *`;

  cron.schedule(cronExpression, async () => {
    console.log(`[Cron] Refreshing prices...`);
    await fetchAndCachePrices();
  });

  console.log(`⏰ Price refresh cron running every ${intervalMinutes} minutes`);

  // Also fetch immediately on startup
  fetchAndCachePrices().catch(console.error);
}
