import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'DCAlog',
    short_name: 'DCAlog',
    description: 'Track your dollar-cost averaging strategy, monitor buying opportunities, and know when to take profit.',
    start_url: '/app',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0a0a0f',
    theme_color: '#0a0a0f',
    categories: ['finance', 'productivity'],
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
