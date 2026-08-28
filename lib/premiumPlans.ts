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
  bonusPercent?: number;
  bonusImageGenerations?: number;
  bonusVideoGenerations?: number;
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

export function starsFromUsd(usd: number): number {
  const amount = Math.max(0, Number(usd) || 0);
  return Math.max(1, Math.round((amount * BASE_STARS) / BASE_USD));
}

export function formatUsdPrice(usd: number): string {
  return `$${usd.toFixed(2)}`;
}

export function formatStarsCount(stars: number): string {
  return `${Math.round(stars).toLocaleString('en-US')} Stars`;
}

/** Discount applied only when paying with USDT via NOWPayments. Stars stay at full pack price. */
export const CRYPTO_DISCOUNT_PERCENT = 20;

export function cryptoUsdPrice(usd: number): number {
  return Math.round(usd * (100 - CRYPTO_DISCOUNT_PERCENT)) / 100;
}

export function planGenerationCopy(plan: PremiumPlan): string {
  const images = plan.imageGenerations.toLocaleString('en-US');
  const videos = plan.videoGenerations.toLocaleString('en-US');
  const videoWord = plan.videoGenerations === 1 ? 'video' : 'videos';
  return `You get ${images} image generations or ${videos} ${videoWord}`;
}

export function planBonusPercentLabel(plan: PremiumPlan): string | null {
  return plan.bonusPercent ? `+${plan.bonusPercent}%` : null;
}

export function planBonusGenerationCopy(plan: PremiumPlan): string | null {
  if (!plan.bonusImageGenerations || !plan.bonusVideoGenerations) return null;
  const images = plan.bonusImageGenerations.toLocaleString('en-US');
  const videos = plan.bonusVideoGenerations.toLocaleString('en-US');
  const videoWord = plan.bonusVideoGenerations === 1 ? 'video' : 'videos';
  return `+${images} images or +${videos} ${videoWord}`;
}

/** Linear coin rate: $9.99 → 80 Slutcoins (20 images or 10 videos). Pack USD/Stars are unchanged. */
const RATE_SLUTCOINS = 20 * DESIRE_COSTS.image;

function slutcoinsForUsd(usd: number): number {
  return Math.max(1, Math.round((RATE_SLUTCOINS * usd) / BASE_USD));
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
  price?: number;
  badge?: PremiumPlan['badge'];
  bonusPercent?: number;
  desires?: number;
  imageGenerations?: number;
  videoGenerations?: number;
  features: PremiumPlan['features'];
}): PremiumPlan {
  const price = input.price ?? usdFromStars(input.stars);
  const baseCoins = slutcoinsForUsd(price);
  const bonusPercent = input.bonusPercent ?? 0;
  const formulaCoins =
    bonusPercent > 0 ? Math.round((baseCoins * (100 + bonusPercent)) / 100) : baseCoins;
  const imageGenerations =
    input.imageGenerations ?? Math.floor((input.desires ?? formulaCoins) / DESIRE_COSTS.image);
  const videoGenerations =
    input.videoGenerations ?? Math.floor((input.desires ?? formulaCoins) / DESIRE_COSTS.videoBetter);
  const desires = Math.max(
    input.desires ?? formulaCoins,
    imageGenerations * DESIRE_COSTS.image,
    videoGenerations * DESIRE_COSTS.videoBetter,
  );
  const baseImageGenerations = Math.floor(baseCoins / DESIRE_COSTS.image);
  const baseVideoGenerations = Math.floor(baseCoins / DESIRE_COSTS.videoBetter);
  return {
    ...input,
    price,
    desires,
    pricePerDesire: Number((price / desires).toFixed(4)),
    imageGenerations,
    videoGenerations,
    bonusImageGenerations:
      bonusPercent > 0 ? Math.max(0, imageGenerations - baseImageGenerations) : undefined,
    bonusVideoGenerations:
      bonusPercent > 0 ? Math.max(0, videoGenerations - baseVideoGenerations) : undefined,
  };
}

export const PREMIUM_PLANS: PremiumPlan[] = [
  definePlan({
    id: 'ecstasy',
    tier: 'Ecstasy',
    stars: 10000,
    badge: 'Best value',
    bonusPercent: 50,
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
    bonusPercent: 40,
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
    bonusPercent: 30,
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
    badge: 'Most chosen',
    imageGenerations: 60,
    videoGenerations: 30,
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
    id: 'mini',
    tier: 'Mini',
    subtitle: 'Starter',
    stars: starsFromUsd(8),
    price: 8,
    desires: 60,
    imageGenerations: 15,
    videoGenerations: 4,
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

export const DEFAULT_PLAN_INDEX = PREMIUM_PLANS.findIndex((plan) => plan.id === 'flirt');
