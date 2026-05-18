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
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url,
      type: 'article',
      publishedTime: post.date,
      siteName: 'DCAlog',
    },
    twitter: {
      card: 'summary',
      title: post.title,
      description: post.excerpt,
    },
  };
}

export default BlogPost;
