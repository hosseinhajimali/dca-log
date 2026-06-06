'use client';

import Link from 'next/link';
import { useStore } from '@/store/useStore';

export function PublicFooter() {
  const theme = useStore((s) => s.theme);
  const isLight = theme === 'light' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches);

  return (
    <footer className="border-t border-gray-800 bg-gray-950">
      <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <a href="/"><img src={isLight ? '/logo-horizontal-light.svg' : '/logo-horizontal.svg'} alt="DCAlog" className="h-7 w-auto opacity-60 hover:opacity-100 transition-opacity" /></a>
        <div className="flex items-center gap-6">
          <Link href="/contact" className="text-xs text-gray-400 hover:text-gray-200 transition-colors">Contact</Link>
          <a href="https://x.com/DCAlogApp" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors" title="DCAlog on X">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          </a>
          <a href="https://t.me/dcalog_updates" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#229ED9] transition-colors" title="Join DCAlog on Telegram">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
            </svg>
          </a>
          <p className="text-xs text-gray-400">© {new Date().getFullYear()} DCAlog · Think in years, not months.</p>
        </div>
      </div>
    </footer>
  );
}
