import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { Providers } from './providers';
import '../index.css';

export const metadata: Metadata = {
  title: 'DCAlog | Invest consistently. Profit systematically.',
  description: 'Track your dollar-cost averaging strategy, monitor buying opportunities, and know when to take profit, all in one place.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'DCAlog',
  },
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

const themeScript = `
(function() {
  try {
    var stored = localStorage.getItem('dcalog-store');
    var theme = stored ? JSON.parse(stored).state?.theme : null;
    var resolved = theme === 'light' ? 'light'
      : theme === 'dark' ? 'dark'
      : theme === 'system' || !theme
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : 'dark';
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(resolved);
  } catch (e) {}
})();
`;

const swScript = `
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/sw.js');
  });
}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: swScript }} />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#0a0a0f" />
      </head>
      <body>
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
