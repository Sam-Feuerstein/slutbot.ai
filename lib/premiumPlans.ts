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
  concurrentGenerations?: number;
  imageGenerations: number;
  videoGenerations: number;
  features: {
    label: string;
    state: PlanFeatureState;
  }[];
};

/** Pack USD: 1,000 Stars = $25, rounded up to a whole dollar. Crypto invoices this same USD. NOWPayments cannot go below CRYPTO_MIN_USD. */
export const LIST_STARS = 1000;
export const LIST_USD = 25;
export const BASE_STARS = LIST_STARS;
export const BASE_USD = LIST_USD;
export const STARS_USD_RATE = LIST_USD / LIST_STARS;
export const MINI_STARS = 500;
export const MINI_IMAGES = 30;
/** NOWPayments USDT minimum. Invoices below this fail. Coupons cannot go under it. */
export const CRYPTO_MIN_USD = 8.5;
/** Discount applied only when paying with USDT via NOWPayments. Stars stay at full pack price. */
export const CRYPTO_DISCOUNT_PERCENT = 40;

function usdCeilCents(value: number): number {
  return Math.ceil(Math.max(0, Number(value) || 0) * 100 - 1e-9) / 100;
}

function usdCeilDollars(value: number): number {
  return Math.max(0, Math.ceil((Number(value) || 0) - 1e-9));
}

export function usdListFromStars(stars: number): number {
  return usdCeilCents((Math.max(0, Number(stars) || 0) * LIST_USD) / LIST_STARS);
}

export function usdMinFromStars(stars: number): number {
  const amount = Math.max(1, Math.round(Number(stars) || 0));
  return usdCeilCents((amount * CRYPTO_MIN_USD) / MINI_STARS);
}

export function starsFromListUsd(usd: number): number {
  const amount = Math.max(0, Number(usd) || 0);
  return Math.max(1, Math.round((amount * LIST_STARS) / LIST_USD));
}

export function usdFromStars(stars: number): number {
  return usdListFromStars(stars);
}

export function starsFromUsd(usd: number): number {
  return starsFromListUsd(usd);
}

export function formatUsdPrice(usd: number): string {
  return `$${usd.toFixed(2)}`;
}

export function formatStarsCount(stars: number): string {
  return `${Math.round(stars).toLocaleString('en-US')} Telegram Stars`;
}

export function formatUsdWhole(usd: number): string {
  return `$${usdCeilDollars(usd)}`;
}

/** High list USD for a Stars invoice: 1,000 Stars = $25, rounded up to a whole dollar. */
export function usdHighFromStars(stars: number): number {
  return usdCeilDollars(usdListFromStars(stars));
}

export function formatAroundUsd(stars: number): string {
  return `Around $${usdHighFromStars(stars)} USD`;
}

export function formatStarsUsdRange(stars: number): string {
  const min = usdCeilDollars(usdMinFromStars(stars));
  const max = usdCeilDollars(usdListFromStars(stars));
  if (min >= max) return formatUsdWhole(max);
  return `${formatUsdWhole(min)} to ${formatUsdWhole(max)}`;
}

export function formatStarsWithUsd(stars: number): string {
  return `${formatStarsCount(stars)} ≈ ${formatStarsUsdRange(stars)}`;
}

export function cryptoInvoiceUsd(usd: number): number {
  return Math.round(Math.max(CRYPTO_MIN_USD, Number(usd) || 0) * 100) / 100;
}

export function cryptoUsdPrice(usd: number): number {
  const discounted = Math.round(usd * (100 - CRYPTO_DISCOUNT_PERCENT)) / 100;
  return cryptoInvoiceUsd(discounted);
}

export function planGenerationCopy(plan: PremiumPlan): string {
  const images = plan.imageGenerations.toLocaleString('en-US');
  const videos = plan.videoGenerations.toLocaleString('en-US');
  return `GET ${images} IMG OR ${videos} SPICY VIDEOS`;
}

export function planInvoiceCopy(plan: PremiumPlan): string {
  const images = plan.imageGenerations.toLocaleString('en-US');
  const videos = plan.videoGenerations.toLocaleString('en-US');
  return `${images} IMG OR ${videos} SPICY VIDEO GENERATION / Never expires.`;
}

export function planMoreGenerationsCopy(plan: PremiumPlan): string | null {
  const baselineImages = Math.round((plan.stars * MINI_IMAGES) / MINI_STARS);
  if (baselineImages < 1) return null;
  const morePercent = Math.round((plan.imageGenerations / baselineImages - 1) * 100);
  if (morePercent < 1) return null;
  return `GET ${morePercent}% more generations`;
}

export function planBonusPercentLabel(plan: PremiumPlan): string | null {
  if (!plan.bonusPercent) return null;
  return `+${plan.bonusPercent}%`;
}

export function planBonusGenerationCopy(plan: PremiumPlan): string | null {
  if (!plan.bonusImageGenerations || !plan.bonusVideoGenerations) return null;
  const images = plan.bonusImageGenerations.toLocaleString('en-US');
  const videos = plan.bonusVideoGenerations.toLocaleString('en-US');
  const videoWord = plan.bonusVideoGenerations === 1 ? 'video' : 'videos';
  return `+${images} images or +${videos} ${videoWord}`;
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
  imageGenerations?: number;
  videoGenerations?: number;
  concurrentGenerations?: number;
  features: PremiumPlan['features'];
}): PremiumPlan {
  const price = input.price ?? usdHighFromStars(input.stars);
  const imageGenerations = input.imageGenerations ?? Math.round((input.stars * MINI_IMAGES) / MINI_STARS);
  const videoGenerations = input.videoGenerations ?? imageGenerations / 2;
  const desires = Math.max(
    input.stars,
    imageGenerations * DESIRE_COSTS.image,
    videoGenerations * DESIRE_COSTS.videoBetter,
  );
  return {
    ...input,
    price,
    desires,
    pricePerDesire: Number((price / desires).toFixed(4)),
    imageGenerations,
    videoGenerations,
  };
}

export const PREMIUM_PLANS: PremiumPlan[] = [
  definePlan({
    id: 'ecstasy',
    tier: 'Ecstasy',
    stars: 10000,
    badge: 'Best value',
    imageGenerations: 1200,
    videoGenerations: 600,
    concurrentGenerations: 20,
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
    imageGenerations: 400,
    videoGenerations: 200,
    concurrentGenerations: 20,
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
  definePlan({
    id: 'mini',
    tier: 'Mini',
    subtitle: 'Starter',
    stars: MINI_STARS,
    price: 8,
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
