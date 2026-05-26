'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Clock, Tag } from 'lucide-react';
import { BLOG_POSTS } from '@/data/blogPosts';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicFooter } from '@/components/layout/PublicFooter';

const CATEGORY_COLORS: Record<string, string> = {
  Basics:          'text-blue-400 bg-blue-500/10 border-blue-500/20',
  Strategy:        'text-purple-400 bg-purple-500/10 border-purple-500/20',
  Guide:           'text-green-400 bg-green-500/10 border-green-500/20',
  'Tax & Tracking':'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function Blog() {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">

      <PublicNavbar />

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-12 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-50 mb-4">DCAlog Blog</h1>
        <p className="text-gray-400 max-w-xl mx-auto">Guides, strategy, and practical advice for long-term crypto investors.</p>
      </section>

      {/* Posts */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {BLOG_POSTS.map(post => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-2xl p-6 flex flex-col gap-4 transition-colors"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={e => {
                    e.preventDefault();
                    router.push(`/blog/category/${post.category.toLowerCase().replace(/\s+/g, '-')}`);
                  }}
                  className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border transition-opacity hover:opacity-70 ${CATEGORY_COLORS[post.category] ?? 'text-gray-400 bg-gray-800 border-gray-700'}`}
                >
                  <Tag size={10} />
                  {post.category}
                </button>
                <span className="text-xs text-gray-600 flex items-center gap-1">
                  <Clock size={11} />
                  {post.readTime}
                </span>
              </div>

              <div className="flex-1">
                <h2 className="text-base font-semibold text-gray-100 mb-2 group-hover:text-brand-400 transition-colors leading-snug">
                  {post.title}
                </h2>
                <p className="text-sm text-gray-500 leading-relaxed line-clamp-3">{post.excerpt}</p>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">{formatDate(post.date)}</span>
                <span className="inline-flex items-center gap-1 text-xs text-brand-400 font-medium group-hover:gap-2 transition-all">
                  Read more <ArrowRight size={12} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="bg-brand-500/10 border border-brand-500/20 rounded-2xl px-8 py-10 text-center">
          <h2 className="text-xl font-bold text-gray-100 mb-2">Ready to start tracking your DCA?</h2>
          <p className="text-gray-500 mb-6 text-sm">DCAlog is free to use. Set up your first plan in minutes.</p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm"
          >
            Get started for free <ArrowRight size={15} />
          </Link>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
