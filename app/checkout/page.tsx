import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { PREMIUM_PLANS } from '@/lib/premiumPlans';
import { checkoutPromoMediaUrl } from '@/lib/presetMedia';
import { buildPageMetadata } from '@/lib/seo';
import CheckoutClient, { type CheckoutMethod } from './CheckoutClient';

export const metadata = buildPageMetadata({
  title: 'Checkout',
  description: 'Pay for AI SLUTBOT Stars with Telegram Stars or cryptocurrency.',
  path: '/checkout',
  noIndex: true,
});

const CHECKOUT_PROMO_POSTER = checkoutPromoMediaUrl('swipey-promo.jpg', '/checkout/swipey-promo.jpg');
const CHECKOUT_PROMO_VIDEO = checkoutPromoMediaUrl('swipey-promo.mp4', '/checkout/swipey-promo.mp4');

type SearchParams = Promise<{ plan?: string; method?: string }>;

export default async function CheckoutPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const plan =
    PREMIUM_PLANS.find((item) => item.id === params.plan) ??
    PREMIUM_PLANS.find((item) => item.id === 'flirt');
  if (!plan) redirect('/tool');

  // Treat legacy ?method=card as Stars (Credit / Debit Card option)
  const initialMethod: CheckoutMethod = params.method === 'crypto' ? 'crypto' : 'stars';

  return (
    <>
      <link rel="preload" as="image" href={CHECKOUT_PROMO_POSTER} />
      <link rel="preload" as="video" href={CHECKOUT_PROMO_VIDEO} type="video/mp4" />
      <Suspense fallback={<div className="min-h-dvh bg-white" />}>
        <CheckoutClient plan={plan} initialMethod={initialMethod} />
      </Suspense>
    </>
  );
}
