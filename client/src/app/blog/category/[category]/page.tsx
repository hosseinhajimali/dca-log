import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, ArrowLeft, Clock, Tag } from 'lucide-react';
import { BLOG_POSTS } from '@/data/blogPosts';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicFooter } from '@/components/layout/PublicFooter';

const CATEGORY_COLORS: Record<string, string> = {
  basics:           'text-blue-400 bg-blue-500/10 border-blue-500/20',
  strategy:         'text-purple-400 bg-purple-500/10 border-purple-500/20',
  guide:            'text-green-400 bg-green-500/10 border-green-500/20',
  'tax-&-tracking': 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
};

function slugToCategory(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function categoryToSlug(category: string): string {
  return category.toLowerCase().replace(/\s+/g, '-');
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
function formatDate(iso: string) {
  const [year, month, day] = iso.split('-').map(Number);
  return `${MONTHS[month - 1]} ${day}, ${year}`;
}

export async function generateStaticParams() {
  const categories = [...new Set(BLOG_POSTS.map(p => categoryToSlug(p.category)))];
  return categories.map(category => ({ category }));
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params;
  const label = slugToCategory(category);
  return {
    title: `${label} | DCAlog Blog`,
    description: `Browse all ${label} articles on DCAlog.`,
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const label = slugToCategory(category);
  const posts = BLOG_POSTS.filter(p => categoryToSlug(p.category) === category);

  if (posts.length === 0) notFound();

  const colorClass = CATEGORY_COLORS[category] ?? 'text-gray-400 bg-gray-800 border-gray-700';

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <PublicNavbar />

      <section className="max-w-6xl mx-auto px-6 pt-16 pb-12">
        <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 transition-colors mb-8">
          <ArrowLeft size={14} /> All articles
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${colorClass}`}>
            <Tag size={10} />
            {label}
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-50">{label}</h1>
        <p className="text-gray-500 mt-2">{posts.length} article{posts.length !== 1 ? 's' : ''}</p>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {posts.map(post => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-2xl p-6 flex flex-col gap-4 transition-colors"
            >
              <div className="flex items-center gap-2">
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

      <PublicFooter />
    </div>
  );
}
