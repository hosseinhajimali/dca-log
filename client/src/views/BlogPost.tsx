'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock, Tag, ArrowRight } from 'lucide-react';
import { getBlogPost, BLOG_POSTS } from '@/data/blogPosts';
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

        <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 transition-colors mb-10">
          <ArrowLeft size={14} /> Back to blog
        </Link>

        <div className="flex items-center gap-3 flex-wrap mb-6">
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${CATEGORY_COLORS[post.category] ?? 'text-gray-400 bg-gray-800 border-gray-700'}`}>
            <Tag size={10} />
            {post.category}
          </span>
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
