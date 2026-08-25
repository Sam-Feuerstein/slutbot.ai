import { getHomePresetById } from '@/lib/homePresets';
import { absoluteUrl } from '@/lib/seo';
import { GENERATOR_PATH, SITE_URL } from '@/lib/site';

export type BreadcrumbItem = {
  name: string;
  path: string;
};

const HOME: BreadcrumbItem = { name: 'Home', path: '/' };
const GENERATOR: BreadcrumbItem = { name: 'AI Nude Generator', path: GENERATOR_PATH };

const LANDING_NAMES: Record<string, string> = {
  'undress-ai': 'Undress AI',
  'deepnude-ai': 'DeepNude AI',
  'nudify-ai': 'Nudify AI',
  'muke-ai': 'Muke AI',
  'nude-ai': 'Nude AI',
  'ai-clothes-remover': 'AI Clothes Remover',
  'deepsukebe-ai': 'Deepsukebe AI',
  'face-swap-ai': 'Face Swap AI',
  'face-swap-video-ai': 'Face Swap Video AI',
  'face-swap-porn-ai': 'Face Swap Porn AI',
};

const STATIC_TRAILS: Record<string, BreadcrumbItem[]> = {
  [GENERATOR_PATH]: [HOME, GENERATOR],
  '/tool': [HOME, { name: 'AI Nude Generator', path: '/tool' }],
  '/archive': [HOME, { name: 'My Collection', path: '/archive' }],
  '/terms': [HOME, { name: 'Terms of Service', path: '/terms' }],
  '/privacy': [HOME, { name: 'Privacy Policy', path: '/privacy' }],
  '/cookies': [HOME, { name: 'Cookie Policy', path: '/cookies' }],
  '/anti-trafficking': [HOME, { name: 'Anti-Trafficking & Abuse Policy', path: '/anti-trafficking' }],
  '/2257': [HOME, { name: '2257 Compliance Statement', path: '/2257' }],
  '/content-removal': [HOME, { name: 'Content Removal & Complaints', path: '/content-removal' }],
  '/payments/crypto-tutorial': [
    HOME,
    GENERATOR,
    { name: 'Crypto Payment Tutorial', path: '/payments/crypto-tutorial' },
  ],
  '/payments/telegram-stars-tutorial': [
    HOME,
    GENERATOR,
    { name: 'Telegram Stars Payment Tutorial', path: '/payments/telegram-stars-tutorial' },
  ],
};

function normalizePathname(pathname: string): string {
  const path = pathname.split('?')[0]?.split('#')[0] || '/';
  if (path.length > 1 && path.endsWith('/')) return path.slice(0, -1);
  return path || '/';
}

function isPrivatePath(path: string): boolean {
  return (
    path.startsWith('/admin') ||
    path.startsWith('/login') ||
    path.startsWith('/checkout') ||
    path.startsWith('/api')
  );
}

function humanizeSegment(segment: string): string {
  return segment
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function crumbUrl(path: string): string {
  return path === '/' ? SITE_URL : absoluteUrl(path);
}

export function getBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const path = normalizePathname(pathname);
  if (path === '/' || isPrivatePath(path)) return [];

  const staticTrail = STATIC_TRAILS[path];
  if (staticTrail) return staticTrail;

  if (path.startsWith(`${GENERATOR_PATH}/`)) {
    const presetId = path.slice(GENERATOR_PATH.length + 1);
    const preset = getHomePresetById(presetId);
    return [
      HOME,
      GENERATOR,
      { name: preset?.title ?? humanizeSegment(presetId), path },
    ];
  }

  if (!path.slice(1).includes('/')) {
    const landingName = LANDING_NAMES[path.slice(1)];
    if (landingName) {
      return [HOME, { name: landingName, path }];
    }
  }

  const segments = path.split('/').filter(Boolean);
  return [
    HOME,
    ...segments.map((segment, index) => ({
      name: humanizeSegment(segment),
      path: `/${segments.slice(0, index + 1).join('/')}`,
    })),
  ];
}

export function breadcrumbJsonLd(items: BreadcrumbItem[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => {
      const entry: Record<string, unknown> = {
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
      };
      if (index < items.length - 1) {
        entry.item = crumbUrl(item.path);
      }
      return entry;
    }),
  };
}
