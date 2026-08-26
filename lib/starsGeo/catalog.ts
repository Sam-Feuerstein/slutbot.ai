import { PREMIUM_PLANS } from '@/lib/premiumPlans';

/** Packs used by Stars geo quotes. Swap this file when copying `lib/starsGeo` onto another site. */
export type StarsGeoCatalogPack = {
  id: string;
  stars: number;
  label: string;
};

export function starsGeoCatalogPacks(): StarsGeoCatalogPack[] {
  return PREMIUM_PLANS.map((plan) => ({
    id: plan.id,
    stars: plan.stars,
    label: plan.tier,
  }));
}
