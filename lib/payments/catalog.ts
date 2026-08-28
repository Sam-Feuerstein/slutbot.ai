import {
  cryptoInvoiceUsd,
  cryptoUsdPrice,
  planInvoiceCopy,
  PREMIUM_PLANS,
  type PremiumPlan,
} from '@/lib/premiumPlans';

export type CheckoutPlan = {
  id: string;
  tier: string;
  desires: number;
  usdPrice: number;
  starsAmount: number;
  label: string;
  description: string;
};

export function listCheckoutPlans(): CheckoutPlan[] {
  return PREMIUM_PLANS.map(toCheckoutPlan);
}

export function getCheckoutPlan(planId: string): CheckoutPlan | null {
  const plan = PREMIUM_PLANS.find((item) => item.id === planId);
  return plan ? toCheckoutPlan(plan) : null;
}

export function isCheckoutPlanId(planId: string): boolean {
  return PREMIUM_PLANS.some((item) => item.id === planId);
}

function toCheckoutPlan(plan: PremiumPlan): CheckoutPlan {
  return {
    id: plan.id,
    tier: plan.tier,
    desires: plan.desires,
    usdPrice: plan.price,
    starsAmount: plan.stars,
    label: 'AI SLUTBOT',
    description: planInvoiceCopy(plan),
  };
}

export function cryptoUsdForPlan(plan: CheckoutPlan, discountApplied = false): number {
  return cryptoInvoiceUsd(discountApplied ? cryptoUsdPrice(plan.usdPrice) : plan.usdPrice);
}

export function isClientId(value: string): boolean {
  return /^[a-zA-Z0-9_-]{8,128}$/.test(value.trim());
}
