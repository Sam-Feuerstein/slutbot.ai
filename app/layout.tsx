import type { Metadata, Viewport } from 'next';
import AppProviders from './components/AppProviders';
import JsonLd from './components/JsonLd';
import FeaturedOn from './components/FeaturedOn';
import SiteChrome from './components/SiteChrome';
import SiteFooter from './components/SiteFooter';
import { PRESET_MEDIA_BASE } from '@/lib/presetMedia';
import { DEFAULT_OG_IMAGE, organizationJsonLd, websiteJsonLd } from '@/lib/seo';
import { SITE_URL } from '@/lib/site';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'AI Nude image and video Generator | SLUTBOT.AI',
    template: '%s | SLUTBOT AI',
  },
  description:
    'Experience SLUTBOT AI the cutting edge of AI nude video and image generation. Bring your AI SLUT BOT to life in just a few clicks.',
  icons: {
    icon: '/icon.png',
    apple: '/apple-icon.png',
  },
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    siteName: 'SLUTBOT AI',
    locale: 'en_US',
    url: SITE_URL,
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'SLUTBOT AI — AI nude generator',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    images: [DEFAULT_OG_IMAGE],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SLUTBOT AI',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#090505',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
            {PRESET_MEDIA_BASE ? (
              <>
                <link rel="preconnect" href={PRESET_MEDIA_BASE} />
                <link rel="dns-prefetch" href={PRESET_MEDIA_BASE} />
              </>
            ) : null}
            <link rel="preload" as="image" href="/brand/slutbot-logo.webp" type="image/webp" />
            <link rel="preload" as="image" href="/brand/banner-poster.webp" type="image/webp" />
            <link rel="alternate" type="text/plain" href="/llms.txt" title="LLM site summary" />
      </head>
      <body>
        <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />
        <AppProviders>
          <SiteChrome featuredOn={<FeaturedOn />} footer={<SiteFooter />}>
            {children}
          </SiteChrome>
        </AppProviders>
      </body>
    </html>
  );
}
