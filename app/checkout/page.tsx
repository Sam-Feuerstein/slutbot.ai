import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { PREMIUM_PLANS } from '@/lib/premiumPlans';
import { buildPageMetadata } from '@/lib/seo';
import CheckoutClient from './CheckoutClient';

export const metadata = buildPageMetadata({
  title: 'Checkout',
  description: 'Pay for AI SLUTBOT Slutcoins with cryptocurrency.',
  path: '/checkout',
  noIndex: true,
});

type SearchParams = Promise<{ plan?: string; method?: string }>;

export default async function CheckoutPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const plan =
    PREMIUM_PLANS.find((item) => item.id === params.plan) ??
    PREMIUM_PLANS.find((item) => item.id === 'flirt');
  if (!plan) redirect('/tool');

  return (
    <Suspense fallback={<div className="min-h-dvh bg-white" />}>
      <CheckoutClient plan={plan} />
    </Suspense>
  );
}
