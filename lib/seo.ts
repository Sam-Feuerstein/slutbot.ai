import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/site';

export const DEFAULT_OG_IMAGE = `${SITE_URL}/brand/banner-poster.webp`;
export const SEO_LAST_MODIFIED = new Date('2026-08-24T00:00:00.000Z');

export const LEGAL_SITEMAP_PATHS = [
  '/terms',
  '/privacy',
  '/cookies',
  '/anti-trafficking',
  '/2257',
  '/content-removal',
  '/payments/crypto-tutorial',
  '/payments/telegram-stars-tutorial',
] as const;

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export function buildPageMetadata(input: {
  title: string;
  description: string;
  path: string;
  ogTitle?: string;
  noIndex?: boolean;
}): Metadata {
  const url = absoluteUrl(input.path);
  const ogTitle = input.ogTitle ?? `${input.title} | AI SLUTBOT`;

  return {
    title: input.title,
    description: input.description,
    alternates: { canonical: url },
    openGraph: {
      title: ogTitle,
      description: input.description,
      url,
      type: 'website',
      siteName: 'AI SLUTBOT',
      locale: 'en_US',
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
      title: ogTitle,
      description: input.description,
      images: [DEFAULT_OG_IMAGE],
    },
    robots: input.noIndex ? { index: false, follow: false } : { index: true, follow: true },
  };
}

export function faqJsonLd(faq: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: answer,
      },
    })),
  };
}

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'AI SLUTBOT',
    url: SITE_URL,
    logo: absoluteUrl('/brand/aislutbot-logo.webp'),
    email: 'legal@aislutbot.com',
  };
}

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'AI SLUTBOT',
    url: SITE_URL,
    description: 'AI nude generator for uncensored AI slut images and short videos.',
    inLanguage: 'en-US',
  };
}

export function softwareApplicationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'AI SLUTBOT Generator',
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Web',
    url: absoluteUrl('/ai-porn-generator'),
    description: 'AI nude generator: upload a photo and create uncensored AI slut images and 5-second videos online.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
  };
}
