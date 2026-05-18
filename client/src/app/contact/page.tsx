import type { Metadata } from 'next';
import { Mail } from 'lucide-react';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicFooter } from '@/components/layout/PublicFooter';

export const metadata: Metadata = {
  title: 'Contact | DCAlog',
  description: 'Get in touch with the DCAlog team.',
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

          <h1 className="text-3xl font-bold text-white mb-4">Get in touch</h1>
          <p className="text-gray-400 mb-8 leading-relaxed">
            Have a question, found a bug, or want to share feedback? We'd love to hear from you.
          </p>

          <a
            href="mailto:support@dcalog.com"
            className="inline-flex items-center gap-2.5 bg-brand-600 hover:bg-brand-500 text-white font-medium px-6 py-3 rounded-xl transition-colors text-sm"
          >
            <Mail size={16} />
            support@dcalog.com
          </a>

          <p className="text-xs text-gray-600 mt-6">We typically respond within 24–48 hours.</p>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
