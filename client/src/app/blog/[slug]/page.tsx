import type { Metadata } from 'next';
import { getBlogPost } from '@/data/blogPosts';
import BlogPost from '@/views/BlogPost';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return { title: 'Blog | DCAlog' };

  const url = `https://dcalog.com/blog/${slug}`;

  return {
    title: `${post.title} | DCAlog`,
    description: post.excerpt,
    alternates: { canonical: url },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url,
      type: 'article',
      publishedTime: post.date,
      siteName: 'DCAlog',
      images: [{ url: 'https://dcalog.com/og-image.png', width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      images: ['https://dcalog.com/og-image.png'],
    },
  };
}

export default BlogPost;
