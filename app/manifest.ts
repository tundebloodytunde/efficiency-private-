import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Efficiency',
    short_name: 'Efficiency',
    description: 'Your daily task and productivity companion',
    start_url: '/today',
    display: 'standalone',
    background_color: '#f3f4f6',
    theme_color: '#1d4ed8',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
