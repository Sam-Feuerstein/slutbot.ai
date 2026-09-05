import { DESIRE_COSTS } from '@/lib/desires';

export type PlanFeatureState = 'star' | 'check' | 'off';

export type PremiumPlan = {
  id: string;
  name: string;
  tier: string;
  subtitle?: string;
  desires: number;
  pricePerDesire: number;
  price: number;
  stars: number;
  badge?: 'Best value' | 'Bestseller';
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

/** Telegram charges ~$9.97 for 750 Stars. Catalog invoices must use these Star amounts only. */
export const LIST_STARS = 750;
export const LIST_USD = 9.97;
export const BASE_STARS = LIST_STARS;
export const BASE_USD = LIST_USD;
export const STARS_USD_RATE = LIST_USD / LIST_STARS;
export const MINI_STARS = 750;
export const MINI_IMAGES = 72;
export const TELEGRAM_STAR_AMOUNTS = [750, 1500, 2500, 5000] as const;

export function isTelegramStarAmount(stars: number): boolean {
  return (TELEGRAM_STAR_AMOUNTS as readonly number[]).includes(Math.round(stars));
}

export function usdTelegramFromStars(stars: number): number {
  const raw = (Math.max(0, Number(stars) || 0) * LIST_USD) / LIST_STARS;
  return Math.round(raw * 100) / 100;
}
/** NOWPayments USDT TRC20 will not create a payment below this. Coupons cannot go under it. */
export const CRYPTO_MIN_USD = 12;
/** Discount applied only when paying with USDT via NOWPayments. Stars stay at full pack price. */
export const CRYPTO_DISCOUNT_PERCENT = 40;

function usdCeilCents(value: number): number {
  return Math.ceil(Math.max(0, Number(value) || 0) * 100 - 1e-9) / 100;
}

function usdCeilDollars(value: number): number {
  return Math.max(0, Math.ceil((Number(value) || 0) - 1e-9));
}

export function usdListFromStars(stars: number): number {
  return usdTelegramFromStars(stars);
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

export function planStarsLabel(stars: number): string {
  return `${Math.round(stars).toLocaleString('en-US')} Stars`;
}

export function formatUsdWhole(usd: number): string {
  return `$${usdCeilDollars(usd)}`;
}

/** Whole-dollar ceiling of the Telegram USD rate (checkout crypto still uses exact plan.price). */
export function usdHighFromStars(stars: number): number {
  return usdCeilDollars(usdTelegramFromStars(stars));
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

/**
 * Crypto price matches the real Telegram Stars value: 600 Stars = $7.80,
 * i.e. $0.013 per Star. No discount, no markup.
 */
export const CRYPTO_USD_PER_STAR = 0.013;

export function cryptoUsdForStars(stars: number): number {
  const raw = Math.max(0, Number(stars) || 0) * CRYPTO_USD_PER_STAR;
  return Math.round(raw * 100) / 100;
}

/** Crypto packs start at the novice — the 750 Starter is sold out on crypto. */
export const CRYPTO_MIN_STARS = 1500;

export function isCryptoAvailableForStars(stars: number): boolean {
  return Math.round(Number(stars) || 0) >= CRYPTO_MIN_STARS;
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

export function planOfferBaseline(plan: PremiumPlan): { images: number; videos: number } {
  const images = Math.round((plan.stars * MINI_IMAGES) / MINI_STARS);
  return { images, videos: images / 2 };
}

export function planMoreGenerationsCopy(plan: PremiumPlan): string | null {
  return planTotalSavedCopy(plan);
}

export function planTotalSavedCopy(plan: PremiumPlan): string | null {
  const percent = planOfferBonusPercent(plan);
  if (percent < 1) return null;
  const baseline = planOfferBaseline(plan);
  const extraImages = plan.imageGenerations - baseline.images;
  const extraVideos = plan.videoGenerations - baseline.videos;
  if (extraImages <= 0 || extraVideos <= 0) return null;
  const images = extraImages.toLocaleString('en-US');
  const videos = extraVideos.toLocaleString('en-US');
  const videoWord = extraVideos === 1 ? 'video' : 'videos';
  return `+${images} images or +${videos} ${videoWord}`;
}

export function planOfferMoreBadgeLabel(plan: PremiumPlan): string | null {
  const percent = planOfferBonusPercent(plan);
  if (percent < 1) return null;
  return `GET ${percent}% MORE`;
}

export function planOfferBonusPercent(plan: PremiumPlan): number {
  const baselineImages = Math.round((plan.stars * MINI_IMAGES) / MINI_STARS);
  if (baselineImages < 1) return 0;
  return Math.max(0, Math.round((plan.imageGenerations / baselineImages - 1) * 100));
}

export function planBonusPercentLabel(plan: PremiumPlan): string | null {
  const percent = plan.bonusPercent ?? planOfferBonusPercent(plan);
  if (percent < 1) return null;
  return `+${percent}%`;
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
  name: string;
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
    tier: planStarsLabel(input.stars),
    price,
    desires,
    pricePerDesire: Number((price / desires).toFixed(4)),
    imageGenerations,
    videoGenerations,
  };
}

export const PREMIUM_PLANS: PremiumPlan[] = [
  definePlan({
    id: 'passion',
    name: 'The Aislutboss',
    stars: 5000,
    price: usdTelegramFromStars(5000),
    imageGenerations: 576,
    videoGenerations: 288,
    badge: 'Best value',
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
    id: 'desire',
    name: 'The Player',
    stars: 2500,
    price: usdTelegramFromStars(2500),
    imageGenerations: 260,
    videoGenerations: 130,
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
    name: 'The novice',
    stars: 1500,
    price: usdTelegramFromStars(1500),
    imageGenerations: 150,
    videoGenerations: 75,
    badge: 'Bestseller',
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
    id: 'spark',
    name: 'The Starter',
    stars: 750,
    price: usdTelegramFromStars(750),
    imageGenerations: 72,
    videoGenerations: 36,
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

for (const plan of PREMIUM_PLANS) {
  if (!isTelegramStarAmount(plan.stars)) {
    throw new Error(`Pack ${plan.id} is not a Telegram Star option`);
  }
  if (plan.imageGenerations % 2 !== 0) {
    throw new Error(`Pack ${plan.id} image generation count must be even`);
  }
  if (plan.imageGenerations !== plan.videoGenerations * 2) {
    throw new Error(`Pack ${plan.id} must be 2 images per video`);
  }
}
