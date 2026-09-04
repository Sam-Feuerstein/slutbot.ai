import type { NextConfig } from 'next';

function mediaRemotePatterns(): NonNullable<NextConfig['images']>['remotePatterns'] {
  const patterns: NonNullable<NextConfig['images']>['remotePatterns'] = [
    { protocol: 'https', hostname: '*.r2.dev', pathname: '/**' },
    { protocol: 'https', hostname: 'spicybox-generations.b-cdn.net', pathname: '/**' },
  ];

  const base =
    process.env.NEXT_PUBLIC_PRESET_MEDIA_BASE ||
    'https://pub-17aa5d996caf4f7086190be5ee8807c5.r2.dev';
  if (base) {
    try {
      const url = new URL(base);
      patterns.unshift({
        protocol: (url.protocol.replace(':', '') as 'http' | 'https'),
        hostname: url.hostname,
        pathname: '/**',
      });
    } catch {
      // Ignore invalid public media URL; local/dev still works without it.
    }
  }

  return patterns;
}

const nextConfig: NextConfig = {
  reactStrictMode: false,
  poweredByHeader: false,
  compress: true,
  serverExternalPackages: ['web-push', 'ffmpeg-static', 'nodemailer'],
  images: {
    remotePatterns: mediaRemotePatterns(),
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [390, 430, 640, 750, 828, 1080, 1200, 1920],
    imageSizes: [48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '40mb',
    },
    proxyClientMaxBodySize: '40mb',
  },
  async headers() {
    return [
      {
        source: '/brand/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=2592000, stale-while-revalidate=86400',
          },
        ],
      },
      {
        source: '/examples/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=2592000, stale-while-revalidate=86400',
          },
        ],
      },
      {
        source: '/rta-label.jpg',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=2592000, stale-while-revalidate=86400',
          },
        ],
      },
      {
        source: '/icons/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=2592000, stale-while-revalidate=86400',
          },
        ],
      },
      {
        source: '/apple-touch-icon.png',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=2592000, stale-while-revalidate=86400',
          },
        ],
      },
      {
        source: '/favicon.ico',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=2592000, stale-while-revalidate=86400',
          },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ];
  },
};

export default nextConfig;
