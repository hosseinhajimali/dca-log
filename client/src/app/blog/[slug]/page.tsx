import type { Metadata } from 'next';
import { getBlogPost } from '@/data/blogPosts';
import BlogPost from '@/views/BlogPost';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return { title: 'Blog | DCAlog' };
  return { title: `${post.title} | DCAlog` };
}

export default BlogPost;
