import type { Metadata } from 'next';
import { Mail } from 'lucide-react';
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

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <PublicNavbar />

      <main className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="max-w-lg w-full text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-500/10 mb-6">
            <Mail size={24} className="text-brand-400" />
          </div>

          <h1 className="text-3xl font-bold text-gray-50 mb-4">Get in touch</h1>
          <p className="text-gray-400 mb-8 leading-relaxed">
            Have a question, found a bug, or want to share feedback? We'd love to hear from you.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 flex-wrap">
            <a
              href="mailto:support@dcalog.com"
              className="inline-flex items-center gap-2.5 bg-brand-600 hover:bg-brand-500 text-white font-medium px-6 py-3 rounded-xl transition-colors text-sm"
            >
              <Mail size={16} />
              support@dcalog.com
            </a>
            <a
              href="https://x.com/DCAlogApp"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white font-medium px-6 py-3 rounded-xl transition-colors text-sm"
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              @DCAlogApp
            </a>
            <a
              href="https://t.me/dcalog_updates"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 bg-[#229ED9]/10 hover:bg-[#229ED9]/20 border border-[#229ED9]/30 text-[#229ED9] font-medium px-6 py-3 rounded-xl transition-colors text-sm"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
              </svg>
              Join on Telegram
            </a>
          </div>

          <p className="text-xs text-gray-600 mt-6">We typically respond within 24–48 hours.</p>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
