import type { Metadata } from 'next';
import Blog from '@/views/Blog';

export const metadata: Metadata = {
  title: 'Blog | DCAlog',
  description: 'Guides and strategies for dollar-cost averaging investors.',
  alternates: { canonical: 'https://dcalog.com/blog' },
  openGraph: {
    title: 'Blog | DCAlog',
    description: 'Guides and strategies for dollar-cost averaging investors.',
    url: 'https://dcalog.com/blog',
    type: 'website',
    siteName: 'DCAlog',
    images: [{ url: 'https://dcalog.com/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Blog | DCAlog',
    description: 'Guides and strategies for dollar-cost averaging investors.',
    images: ['https://dcalog.com/og-image.png'],
  },
};

export default Blog;
