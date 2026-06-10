import type { Metadata } from 'next';
import { Mail, ArrowUpRight } from 'lucide-react';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicFooter } from '@/components/layout/PublicFooter';

export const metadata: Metadata = {
  title: 'Contact | DCAlog',
  description: 'Get in touch with the DCAlog team.',
  alternates: { canonical: 'https://dcalog.com/contact' },
  openGraph: {
    title: 'Contact | DCAlog',
    description: 'Get in touch with the DCAlog team.',
    url: 'https://dcalog.com/contact',
    type: 'website',
    siteName: 'DCAlog',
    images: [{ url: 'https://dcalog.com/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contact | DCAlog',
    description: 'Get in touch with the DCAlog team.',
    images: ['https://dcalog.com/og-image.png'],
  },
};

function XIcon({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function TelegramIcon({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

const CHANNELS = [
  {
    Icon: Mail,
    label: 'Email',
    value: 'support@dcalog.com',
    desc: 'Questions, bug reports, account issues, feedback. We read everything.',
    href: 'mailto:support@dcalog.com',
    external: false,
  },
  {
    Icon: XIcon,
    label: 'X / Twitter',
    value: '@DCAlogApp',
    desc: 'Follow for product updates, or send us a DM if email is not your thing.',
    href: 'https://x.com/DCAlogApp',
    external: true,
  },
  {
    Icon: TelegramIcon,
    label: 'Telegram',
    value: '@dcalog_updates',
    desc: 'Join the channel for release notes and announcements as they ship.',
    href: 'https://t.me/dcalog_updates',
    external: true,
  },
];

const TIPS = [
  {
    n: '01',
    title: 'Bug reports',
    desc: 'Tell us what you did, what you expected, and what happened instead. Browser and device details help us reproduce it faster.',
  },
  {
    n: '02',
    title: 'Feature requests',
    desc: 'Describe the problem you are trying to solve, not just the feature. It helps us build the right thing.',
  },
  {
    n: '03',
    title: 'Everything else',
    desc: 'Partnerships, press, or just to say the app saved you a spreadsheet. We are happy to hear it.',
  },
];

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      <PublicNavbar />

      <main className="flex-1">
        {/* ── Header ── */}
        <section className="max-w-6xl mx-auto px-6 pt-14 sm:pt-20 pb-12">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-brand-400 mb-4">
              Contact
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-50 tracking-tight mb-4">
              Get in touch
            </h1>
            <p className="text-gray-400 leading-relaxed max-w-xl">
              Have a question, found a bug, or want to share feedback? Pick a channel below. We typically respond within 24 to 48 hours.
            </p>
          </div>
        </section>

        {/* ── Channels ── */}
        <section className="max-w-6xl mx-auto px-6 pb-16">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-gray-700 border border-gray-700 rounded-lg overflow-hidden">
            {CHANNELS.map(({ Icon, label, value, desc, href, external }) => (
              <a
                key={label}
                href={href}
                {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                className="group bg-gray-900 p-6 hover:bg-gray-800 transition-colors flex flex-col"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-brand-400" aria-hidden="true">
                    <Icon size={16} />
                  </span>
                  <ArrowUpRight
                    size={14}
                    className="text-gray-500 group-hover:text-gray-300 transition-colors"
                    aria-hidden="true"
                  />
                </div>
                <p className="text-[11px] font-semibold tracking-wider uppercase text-gray-500 mb-1.5">
                  {label}
                </p>
                <p className="font-mono text-sm text-gray-100 mb-2 break-all">{value}</p>
                <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
              </a>
            ))}
          </div>
          <p className="font-mono text-xs text-gray-500 mt-6">
            response time: 24-48h · no ticketing system, a human reads your message
          </p>
        </section>

        {/* ── Divider ── */}
        <div className="border-t border-gray-800" />

        {/* ── Before you write ── */}
        <section className="max-w-6xl mx-auto px-6 py-16 sm:py-20">
          <div className="mb-10">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-brand-400 mb-4">
              Before you write
            </p>
            <h2 className="text-2xl font-bold text-gray-100">Help us help you faster</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {TIPS.map(({ n, title, desc }) => (
              <div key={n} className="border-t-2 border-gray-700 pt-5">
                <p className="font-mono text-xs text-gray-500 mb-3" aria-hidden="true">
                  {n}
                </p>
                <h3 className="text-base font-semibold text-gray-100 mb-2">{title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
