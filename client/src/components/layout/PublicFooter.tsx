'use client';

import Link from 'next/link';

export function PublicFooter() {
  return (
    <footer className="border-t border-gray-800">
      <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <a href="/"><img src="/logo-horizontal.svg" alt="DCAlog" className="h-7 w-auto opacity-60 hover:opacity-100 transition-opacity" /></a>
        <div className="flex items-center gap-6">
          <Link href="/contact" className="text-xs text-gray-600 hover:text-gray-400 transition-colors">Contact</Link>
          <p className="text-xs text-gray-600">© {new Date().getFullYear()} DCAlog · Think in years, not months.</p>
        </div>
      </div>
    </footer>
  );
}
