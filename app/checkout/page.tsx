import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { PREMIUM_PLANS } from '@/lib/premiumPlans';
import { checkoutPromoMediaUrl } from '@/lib/presetMedia';
import { buildPageMetadata } from '@/lib/seo';
import CheckoutClient from './CheckoutClient';

export const metadata = buildPageMetadata({
  title: 'Checkout',
  description: 'Pay for AI SLUTBOT Stars with Telegram Stars.',
  path: '/checkout',
  noIndex: true,
});

const CHECKOUT_PROMO_POSTER = checkoutPromoMediaUrl('swipey-promo.jpg', '/checkout/swipey-promo.jpg');
const CHECKOUT_PROMO_VIDEO = checkoutPromoMediaUrl('AISLUTBOT-NUDE GENERATOR.mp4', '/checkout/swipey-promo.mp4');

type SearchParams = Promise<{ plan?: string; method?: string }>;

export default async function CheckoutPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const requested = params.plan === 'mini' ? 'spark' : params.plan;
  const plan =
    PREMIUM_PLANS.find((item) => item.id === requested) ??
    PREMIUM_PLANS.find((item) => item.id === 'flirt');
  if (!plan) redirect('/tool');

  return (
    <>
      <link rel="preload" as="image" href={CHECKOUT_PROMO_POSTER} />
      <link rel="preload" as="video" href={CHECKOUT_PROMO_VIDEO} type="video/mp4" />
      <Suspense fallback={<div className="min-h-dvh bg-[#0a0208]" />}>
        <CheckoutClient plan={plan} />
      </Suspense>
    </>
  );
}
