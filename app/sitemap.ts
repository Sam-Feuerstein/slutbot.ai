import type { MetadataRoute } from 'next';
import { getHomePresetIds } from '@/lib/homePresets';
import { SEO_LANDING_PAGES } from '@/lib/seoLandingPages';
import { LEGAL_SITEMAP_PATHS, SEO_LAST_MODIFIED } from '@/lib/seo';
import { EXPLORE_PATH, GENERATOR_CANONICAL, SITE_URL, generatorPresetPath } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: SEO_LAST_MODIFIED,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: GENERATOR_CANONICAL,
      lastModified: SEO_LAST_MODIFIED,
      changeFrequency: 'daily',
      priority: 0.95,
    },
    {
      url: `${SITE_URL}${EXPLORE_PATH}`,
      lastModified: SEO_LAST_MODIFIED,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    ...getHomePresetIds().map((presetId) => ({
      url: `${SITE_URL}${generatorPresetPath(presetId)}`,
      lastModified: SEO_LAST_MODIFIED,
      changeFrequency: 'weekly' as const,
      priority: 0.85,
    })),
    ...SEO_LANDING_PAGES.map((page) => ({
      url: `${SITE_URL}/${page.slug}`,
      lastModified: SEO_LAST_MODIFIED,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    ...LEGAL_SITEMAP_PATHS.map((path) => ({
      url: `${SITE_URL}${path}`,
      lastModified: SEO_LAST_MODIFIED,
      changeFrequency: 'monthly' as const,
      priority: 0.4,
    })),
  ];
}
