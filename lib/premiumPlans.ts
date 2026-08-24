import { DESIRE_COSTS } from '@/lib/desires';

export type PlanFeatureState = 'star' | 'check' | 'off';

export type PremiumPlan = {
  id: string;
  tier: string;
  subtitle?: string;
  desires: number;
  pricePerDesire: number;
  price: number;
  stars: number;
  badge?: 'Best value' | 'Most chosen';
  imageGenerations: number;
  videoGenerations: number;
  features: {
    label: string;
    state: PlanFeatureState;
  }[];
};

/** Consumer Stars ↔ USD: 660 Stars = $9.99. All pack USD and NOWPayments invoices use this. */
export const BASE_STARS = 660;
export const BASE_USD = 9.99;
export const STARS_USD_RATE = BASE_USD / BASE_STARS;

export function usdFromStars(stars: number): number {
  return Math.round((stars * BASE_USD * 100) / BASE_STARS) / 100;
}

export function formatUsdPrice(amount: number): string {
  return Number.isInteger(amount) ? `$${amount}` : `$${amount.toFixed(2)}`;
}

/**
 * Original catalog $/Slutcoin. New packs keep that curve so coin grants
 * scale with the corrected USD, not with a wrong Stars rate.
 */
const ORIGINAL_PACK_VALUE: Record<string, { usd: number; desires: number }> = {
  tease: { usd: 20, desires: 50 },
  flirt: { usd: 40, desires: 150 },
  desire: { usd: 60, desires: 300 },
  passion: { usd: 120, desires: 900 },
  ecstasy: { usd: 300, desires: 4000 },
};

function slutcoinsForUsd(planId: string, usd: number): number {
  const original = ORIGINAL_PACK_VALUE[planId];
  if (!original) return Math.max(1, Math.round(usd / 0.4));
  return Math.max(1, Math.round((original.desires * usd) / original.usd));
}

const BASE_FEATURES = {
  hd: 'HD mode',
  proExports: 'Pro-Grade Exports: No watermarks, blurring',
  ultraHd: 'Ultra-HD Rendering',
  unlimitedHistory: 'Unlimited Generation History',
  history48h: '48 hours Generation History',
  faster: 'Faster Generation',
  fullVideo: 'Full-capability video generation',
  highQuality: 'High Quality',
  priority: 'Instant Priority Access',
} as const;

function features(
  config: Partial<Record<keyof typeof BASE_FEATURES, PlanFeatureState>>,
): PremiumPlan['features'] {
  return (Object.keys(BASE_FEATURES) as (keyof typeof BASE_FEATURES)[]).map((key) => ({
    label: BASE_FEATURES[key],
    state: config[key] ?? 'off',
  }));
}

function definePlan(input: {
  id: string;
  tier: string;
  subtitle?: string;
  stars: number;
  badge?: PremiumPlan['badge'];
  features: PremiumPlan['features'];
}): PremiumPlan {
  const price = usdFromStars(input.stars);
  const desires = slutcoinsForUsd(input.id, price);
  return {
    ...input,
    price,
    desires,
    pricePerDesire: Number((price / desires).toFixed(4)),
    imageGenerations: Math.floor(desires / DESIRE_COSTS.image),
    videoGenerations: Math.floor(desires / DESIRE_COSTS.videoBetter),
  };
}

export const PREMIUM_PLANS: PremiumPlan[] = [
  definePlan({
    id: 'ecstasy',
    tier: 'Ecstasy',
    stars: 10000,
    badge: 'Best value',
    features: features({
      hd: 'star',
      proExports: 'star',
      ultraHd: 'star',
      unlimitedHistory: 'check',
      faster: 'check',
      fullVideo: 'check',
      highQuality: 'check',
      priority: 'check',
    }),
  }),
  definePlan({
    id: 'passion',
    tier: 'Passion',
    stars: 5000,
    features: features({
      hd: 'star',
      proExports: 'star',
      ultraHd: 'star',
      history48h: 'check',
      faster: 'check',
      fullVideo: 'check',
      highQuality: 'check',
      priority: 'check',
    }),
  }),
  definePlan({
    id: 'desire',
    tier: 'Desire',
    stars: 2500,
    features: features({
      hd: 'star',
      proExports: 'star',
      ultraHd: 'star',
      history48h: 'check',
      faster: 'check',
      fullVideo: 'check',
      highQuality: 'check',
      priority: 'check',
    }),
  }),
  definePlan({
    id: 'flirt',
    tier: 'Flirt',
    stars: 1000,
    features: features({
      proExports: 'check',
      ultraHd: 'check',
      history48h: 'check',
      faster: 'check',
      fullVideo: 'check',
      highQuality: 'check',
      priority: 'check',
    }),
  }),
  definePlan({
    id: 'tease',
    tier: 'Tease',
    subtitle: 'Starter',
    stars: BASE_STARS,
    badge: 'Most chosen',
    features: features({
      proExports: 'check',
      ultraHd: 'check',
      history48h: 'check',
      faster: 'check',
      fullVideo: 'check',
      highQuality: 'check',
      priority: 'check',
    }),
  }),
];

export const DEFAULT_PLAN_INDEX = PREMIUM_PLANS.findIndex((plan) => plan.id === 'tease');
