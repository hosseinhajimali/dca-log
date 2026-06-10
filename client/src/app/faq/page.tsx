import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { PUBLIC_FAQ_GROUPS } from '@/data/faq';

const TITLE = 'FAQ | DCAlog';
const DESCRIPTION =
  'Frequently asked questions about DCAlog: dollar-cost averaging, DCA plans, buying and sell rules, P&L tracking, the simulator, projections, and tax reports.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: 'https://dcalog.com/faq' },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: 'https://dcalog.com/faq',
    type: 'website',
    siteName: 'DCAlog',
    images: [{ url: 'https://dcalog.com/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['https://dcalog.com/og-image.png'],
  },
};

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: PUBLIC_FAQ_GROUPS.flatMap((group) =>
    group.items.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    }))
  ),
};

export default function FaqPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <PublicNavbar />

      <main className="flex-1">
        {/* ── Header ── */}
        <section className="max-w-6xl mx-auto px-6 pt-14 sm:pt-20 pb-12">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-brand-400 mb-4">
              FAQ
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-50 tracking-tight mb-4">
              Frequently asked questions
            </h1>
            <p className="text-gray-400 leading-relaxed max-w-xl">
              Everything you need to know about tracking your dollar-cost averaging strategy with DCAlog. Can't find your answer?{' '}
              <Link href="/contact" className="text-brand-400 hover:text-brand-300 underline underline-offset-2 transition-colors">
                Get in touch
              </Link>
              .
            </p>
          </div>
        </section>

        {/* ── Questions ── */}
        <section className="max-w-6xl mx-auto px-6 pb-16 sm:pb-20 space-y-10">
          {PUBLIC_FAQ_GROUPS.map((group) => (
            <div key={group.title}>
              <h2 className="text-xs font-semibold tracking-[0.2em] uppercase text-gray-500 mb-3">
                {group.title}
              </h2>
              <div className="bg-gray-900 border border-gray-800 rounded-xl px-5 sm:px-6">
                {group.items.map((item) => (
                  <details key={item.q} className="group border-b border-gray-800 last:border-0">
                    <summary className="flex items-center justify-between gap-4 py-4 cursor-pointer list-none text-sm sm:text-base font-medium text-gray-200 hover:text-gray-100 transition-colors [&::-webkit-details-marker]:hidden">
                      <span>{item.q}</span>
                      <ChevronDown
                        size={16}
                        strokeWidth={2}
                        aria-hidden="true"
                        className="shrink-0 text-gray-500 transition-transform duration-200 group-open:rotate-180"
                      />
                    </summary>
                    <p className="pb-4 text-sm text-gray-400 leading-relaxed">{item.a}</p>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* ── CTA ── */}
        <div className="border-t border-gray-800" />
        <section className="max-w-6xl mx-auto px-6 py-16 sm:py-20 text-center">
          <h2 className="text-2xl font-bold text-gray-100 mb-3">Ready to start tracking?</h2>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            Create a free account and log your first DCA plan in under a minute.
          </p>
          <Link
            href="/login"
            className="inline-block bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium px-6 py-3 rounded-lg transition-colors"
          >
            Get started free
          </Link>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
