import type { Metadata } from 'next';
import { Providers } from './providers';
import '../index.css';

export const metadata: Metadata = {
  title: 'DCAlog | Invest consistently. Profit systematically.',
  description: 'Track your dollar-cost averaging strategy, monitor buying opportunities, and know when to take profit — all in one place.',
  openGraph: {
    type: 'website',
    url: 'https://dcalog.com/',
    title: 'DCAlog | Invest consistently. Profit systematically.',
    description: 'Track your DCA strategy, monitor buying opportunities, and know when to take profit.',
    images: [{ url: 'https://dcalog.com/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DCAlog | Invest consistently. Profit systematically.',
    description: 'Track your DCA strategy, monitor buying opportunities, and know when to take profit.',
    images: ['https://dcalog.com/og-image.png'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
