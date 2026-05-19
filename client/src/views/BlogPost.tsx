'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock, Tag, ArrowRight, Link2, Check } from 'lucide-react';
import { getBlogPost, BLOG_POSTS } from '@/data/blogPosts';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { useState } from 'react';

const CATEGORY_COLORS: Record<string, string> = {
  Basics:          'text-blue-400 bg-blue-500/10 border-blue-500/20',
  Strategy:        'text-purple-400 bg-purple-500/10 border-purple-500/20',
  Guide:           'text-green-400 bg-green-500/10 border-green-500/20',
  'Tax & Tracking':'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function ShareButtons({ title, excerpt }: { title: string; excerpt: string }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== 'undefined' ? window.location.href : '';
  const text = encodeURIComponent(title);
  const encodedUrl = encodeURIComponent(url);

  const links = [
    {
      label: 'Telegram',
      href: `https://t.me/share/url?url=${encodedUrl}&text=${text}`,
      color: 'hover:text-[#229ED9]',
      icon: (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
        </svg>
      ),
    },
    {
      label: 'X',
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${text}`,
      color: 'hover:text-white',
      icon: (
        <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      ),
    },
    {
      label: 'Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      color: 'hover:text-[#1877F2]',
      icon: (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      ),
    },
    {
      label: 'LinkedIn',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      color: 'hover:text-[#0A66C2]',
      icon: (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
        </svg>
      ),
    },
    {
      label: 'Email',
      href: `mailto:?subject=${text}&body=${encodeURIComponent(excerpt + '\n\n' + url)}`,
      color: 'hover:text-brand-400',
      icon: (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
        </svg>
      ),
    },
  ];

  async function copyLink() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-center gap-1 mt-10 pt-8 border-t border-gray-800">
      <span className="text-xs text-gray-600 mr-2">Share</span>
      {links.map(l => (
        <a
          key={l.label}
          href={l.href}
          target="_blank"
          rel="noopener noreferrer"
          title={l.label}
          className={`flex items-center justify-center w-8 h-8 rounded-lg text-gray-600 ${l.color} hover:bg-gray-800 transition-colors`}
        >
          {l.icon}
        </a>
      ))}
      <button
        onClick={copyLink}
        title="Copy link"
        className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-600 hover:text-gray-300 hover:bg-gray-800 transition-colors"
      >
        {copied ? <Check size={15} className="text-green-400" /> : <Link2 size={15} />}
      </button>
    </div>
  );
}

export default function BlogPost() {
  const { slug } = useParams() as { slug: string };
  const router = useRouter();
  const post = getBlogPost(slug ?? '');

  if (!post) { router.replace('/blog'); return null; }

  const others = BLOG_POSTS.filter(p => p.slug !== slug).slice(0, 2);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">

      <PublicNavbar />

      <article className="max-w-2xl mx-auto px-6 pt-12 pb-20">

        <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 transition-all duration-150 hover:-translate-x-0.5 mb-10 group">
          <ArrowLeft size={14} className="transition-transform duration-150 group-hover:-translate-x-0.5" /> Back to blog
        </Link>

        <div className="flex items-center gap-3 flex-wrap mb-6">
          <Link
            href={`/blog/category/${post.category.toLowerCase().replace(/\s+/g, '-')}`}
            className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border hover:opacity-70 transition-opacity ${CATEGORY_COLORS[post.category] ?? 'text-gray-400 bg-gray-800 border-gray-700'}`}
          >
            <Tag size={10} />
            {post.category}
          </Link>
          <span className="text-xs text-gray-600 flex items-center gap-1">
            <Clock size={11} /> {post.readTime}
          </span>
          <span className="text-xs text-gray-600">{formatDate(post.date)}</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-gray-50 mb-6 leading-snug">{post.title}</h1>

        <p className="text-gray-400 text-lg leading-relaxed mb-10 border-l-2 border-brand-500/40 pl-4">{post.excerpt}</p>

        <div className="space-y-8">
          {post.sections.map((section, i) => (
            <div key={i}>
              {section.heading && (
                <h2 className="text-lg font-semibold text-gray-100 mb-3">{section.heading}</h2>
              )}
              <p className="text-gray-400 leading-relaxed">{section.body}</p>
            </div>
          ))}
        </div>

        <ShareButtons title={post.title} excerpt={post.excerpt} />

        <div className="mt-14 bg-brand-500/10 border border-brand-500/20 rounded-2xl px-6 py-8 text-center">
          <h3 className="text-base font-semibold text-gray-100 mb-2">Track your DCA strategy with DCAlog</h3>
          <p className="text-sm text-gray-500 mb-5">Free to use. Set up your first plan in minutes.</p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm"
          >
            Get started for free <ArrowRight size={14} />
          </Link>
        </div>
      </article>

      {others.length > 0 && (
        <section className="max-w-2xl mx-auto px-6 pb-20">
          <h2 className="text-base font-semibold text-gray-300 mb-5">More articles</h2>
          <div className="space-y-4">
            {others.map(p => (
              <Link
                key={p.slug}
                href={`/blog/${p.slug}`}
                className="group flex items-start gap-4 bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl p-4 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-200 group-hover:text-brand-400 transition-colors mb-1 leading-snug">{p.title}</p>
                  <p className="text-xs text-gray-600">{p.readTime} · {formatDate(p.date)}</p>
                </div>
                <ArrowRight size={14} className="text-gray-700 group-hover:text-brand-400 transition-colors shrink-0 mt-0.5" />
              </Link>
            ))}
          </div>
        </section>
      )}

      <PublicFooter />
    </div>
  );
}
