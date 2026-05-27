import type { Metadata } from 'next';
import { Suspense } from 'react';
import PublicSimulator from '@/views/PublicSimulator';

export const metadata: Metadata = {
  title: 'DCA Simulator — DCAlog',
  description: 'See what would have happened if you invested a fixed amount regularly into Bitcoin, Ethereum, or any major crypto. Free DCA backtest tool.',
  openGraph: {
    title: 'DCA Simulator — DCAlog',
    description: 'Backtest any DCA strategy on real historical crypto prices. Free, no account needed.',
    url: 'https://dcalog.com/tools/simulator',
    siteName: 'DCAlog',
  },
};

export default function SimulatorPage() {
  return (
    <Suspense>
      <PublicSimulator />
    </Suspense>
  );
}
