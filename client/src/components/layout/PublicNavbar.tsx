'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X, ArrowRight, UserCircle, LogOut } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Avatar } from '@/components/ui/Avatar';

const NAV_LINKS = [
  { label: 'Home',         section: 'hero' },
  { label: 'Features',     section: 'features' },
  { label: 'How it works', section: 'how-it-works' },
];

export function PublicNavbar() {
  const token  = useStore((s) => s.token);
  const user   = useStore((s) => s.user);
  const logout = useStore((s) => s.logout);
  const pathname = usePathname();
  const router = useRouter();
  const isHome = pathname === '/';

  const [menuOpen, setMenuOpen]           = useState(false);
  const [mobileOpen, setMobileOpen]       = useState(false);
  const [activeSection, setActiveSection] = useState('hero');
  const menuRef = useRef<HTMLDivElement>(null);

  function handleNavClick(section: string) {
    setMobileOpen(false);
    if (isHome) {
      const el = document.getElementById(section);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      router.push(`/#${section}`);
    }
  }

  useEffect(() => {
    if (!isHome) {
      setActiveSection('');
      return;
    }
    const ids = ['hero', 'features', 'how-it-works'];
    const observers = ids.map(id => {
      const el = document.getElementById(id);
      if (!el) return null;
      const observer = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveSection(id); },
        { rootMargin: '-40% 0px -55% 0px' }
      );
      observer.observe(el);
      return observer;
    });
    return () => observers.forEach(o => o?.disconnect());
  }, [isHome]);

  useEffect(() => {
    if (!menuOpen) return;
    function handle(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [menuOpen]);

  const isBlogActive = pathname.startsWith('/blog');

  const navLinkCls = (active: boolean) =>
    `px-3 py-1.5 rounded-lg transition-colors text-sm ${
      active ? 'text-brand-400 bg-brand-500/10' : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800'
    }`;

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="/"><img src="/logo-horizontal.svg" alt="DCAlog" className="h-8 w-auto" /></a>

          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(({ label, section }) => (
              <button
                key={section}
                onClick={() => handleNavClick(section)}
                className={navLinkCls(isHome && activeSection === section)}
              >
                {label}
              </button>
            ))}
            <Link href="/blog" className={navLinkCls(isBlogActive)}>Blog</Link>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(o => !o)}
              className="md:hidden text-gray-400 hover:text-gray-100 transition-colors p-1.5 rounded-lg hover:bg-gray-800"
              aria-label="Menu"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {token ? (
              <>
                <div ref={menuRef} className="relative">
                  <button
                    onClick={() => setMenuOpen(o => !o)}
                    className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    <Avatar id={user?.avatar} size={28} />
                    <span className="text-sm text-gray-300 hidden sm:block">
                      {user?.name?.split(' ')[0] ?? 'Account'}
                    </span>
                  </button>
                  {menuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-52 bg-gray-900 border border-gray-700 rounded-xl shadow-xl overflow-hidden z-50">
                      <div className="px-4 py-3 border-b border-gray-800">
                        <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                      </div>
                      <Link
                        href="/app/settings/profile"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-3 text-sm text-gray-400 hover:text-gray-100 hover:bg-gray-800 transition-colors"
                      >
                        <UserCircle size={14} />
                        Profile settings
                      </Link>
                      <button
                        onClick={() => { logout(); setMenuOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-gray-400 hover:text-red-400 hover:bg-gray-800 transition-colors border-t border-gray-800"
                      >
                        <LogOut size={14} />
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
                <Link
                  href="/app"
                  className="hidden sm:inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  Go to app <ArrowRight size={14} />
                </Link>
              </>
            ) : (
              <>
                <Link href="/login" className="hidden sm:block text-sm text-gray-400 hover:text-gray-100 transition-colors px-3 py-1.5">
                  Sign in
                </Link>
                <Link href="/login" className="bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <div className={`md:hidden border-b border-gray-800 bg-gray-950 px-6 overflow-hidden transition-all duration-300 ease-in-out ${mobileOpen ? 'max-h-72 py-4' : 'max-h-0 py-0'}`}>
        <div className="space-y-1">
          {NAV_LINKS.map(({ label, section }) => (
            <button
              key={section}
              onClick={() => handleNavClick(section)}
              className={`w-full text-left ${navLinkCls(isHome && activeSection === section)}`}
            >
              {label}
            </button>
          ))}
          <Link
            href="/blog"
            onClick={() => setMobileOpen(false)}
            className={`block ${navLinkCls(isBlogActive)}`}
          >
            Blog
          </Link>
          {token && (
            <Link
              href="/app"
              onClick={() => setMobileOpen(false)}
              className="block w-full text-center mt-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Go to app
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
