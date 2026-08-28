import type { Metadata, Viewport } from 'next';
import AppProviders from './components/AppProviders';
import JsonLd from './components/JsonLd';
import FeaturedOn from './components/FeaturedOn';
import PostHogSnippet from './components/PostHogSnippet';
import SiteChrome from './components/SiteChrome';
import SiteFooter from './components/SiteFooter';
import { PRESET_MEDIA_BASE } from '@/lib/presetMedia';
import { DEFAULT_OG_IMAGE, organizationJsonLd, websiteJsonLd } from '@/lib/seo';
import { SITE_URL } from '@/lib/site';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'AI Nude image and video Generator | AI SLUTBOT',
    template: '%s | AI SLUTBOT',
  },
  description:
    'Experience AI SLUTBOT the cutting edge of AI nude video and image generation. Bring your AI SLUT BOT to life in just a few clicks.',
  icons: {
    icon: [
      { url: '/favicon.ico?v=3', sizes: '48x48' },
      { url: '/icon.png?v=3', type: 'image/png', sizes: '32x32' },
    ],
    apple: { url: '/apple-touch-icon.png?v=3', sizes: '180x180' },
  },
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    siteName: 'AI SLUTBOT',
    locale: 'en_US',
    url: SITE_URL,
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'AI SLUTBOT — AI nude generator',
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
    title: 'AI SLUTBOT',
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
            <link rel="manifest" href="/manifest.json?v=3" />
            <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=3" />
            <link rel="apple-touch-icon" href="/icons/icon-192.png?v=3" sizes="192x192" />
            <meta name="apple-mobile-web-app-capable" content="yes" />
            <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
            <meta name="apple-mobile-web-app-title" content="AI SLUTBOT" />
            <link rel="preload" as="image" href="/brand/aislutbot-logo.png" type="image/png" />
            <link rel="alternate" type="text/plain" href="/llms.txt" title="LLM site summary" />
            <PostHogSnippet />
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
