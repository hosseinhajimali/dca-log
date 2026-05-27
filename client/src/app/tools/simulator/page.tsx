import type { Metadata } from 'next';
import { Suspense } from 'react';
import PublicSimulator from '@/views/PublicSimulator';

const BASE_URL   = 'https://dcalog.com';
const PAGE_URL   = `${BASE_URL}/tools/simulator`;
const OG_API_URL = `${BASE_URL}/api/og`;

const FREQ_LABELS: Record<string, string> = {
  WEEKLY: 'weekly', BIWEEKLY: 'bi-weekly', MONTHLY: 'monthly', DAILY: 'daily',
};

type SearchParams = Promise<{ symbol?: string; amount?: string; freq?: string; startDate?: string }>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const { symbol: rawSymbol, amount, freq, startDate: start } = await searchParams;
  const symbol = rawSymbol?.toUpperCase();

  if (symbol && amount && freq) {
    const freqLabel  = FREQ_LABELS[freq] ?? freq.toLowerCase();
    const startYear  = start ? start.slice(0, 4) : null;
    const title       = `$${amount} ${freqLabel} into ${symbol} - DCA Simulator`;
    const description = `What if you DCA'd $${amount} ${freqLabel} into ${symbol}${startYear ? ` since ${startYear}` : ''}? See the real historical returns on DCAlog's free simulator. No account needed.`;
    const ogImageUrl  = `${OG_API_URL}?symbol=${symbol}&amount=${amount}&freq=${freq}${start ? `&startDate=${start}` : ''}`;

    return {
      title,
      description,
      alternates: { canonical: PAGE_URL },
      openGraph: {
        title,
        description,
        url: PAGE_URL,
        siteName: 'DCAlog',
        images: [{ url: ogImageUrl, width: 1200, height: 630, alt: title }],
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [ogImageUrl],
      },
    };
  }

  // Default (no params)
  const title       = 'DCA Simulator - DCAlog';
  const description = 'See what would have happened if you invested a fixed amount regularly into Bitcoin, Ethereum, or any major crypto. Free DCA backtest tool - no account needed.';
  const ogImageUrl  = OG_API_URL;

  return {
    title,
    description,
    alternates: { canonical: PAGE_URL },
    openGraph: {
      title,
      description,
      url: PAGE_URL,
      siteName: 'DCAlog',
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: title }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default function SimulatorPage() {
  return (
    <Suspense>
      <PublicSimulator />
    </Suspense>
  );
}
