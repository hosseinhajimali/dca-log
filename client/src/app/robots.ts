import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/app/', '/auth/'],
      },
    ],
    sitemap: 'https://dcalog.com/sitemap.xml',
  };
}
