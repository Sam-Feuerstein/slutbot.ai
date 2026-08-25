import { redirect } from 'next/navigation';
import { PREMIUM_PLANS } from '@/lib/premiumPlans';
import { buildPageMetadata } from '@/lib/seo';
import CheckoutClient, { type CheckoutMethod } from './CheckoutClient';

export const metadata = buildPageMetadata({
  title: 'Checkout',
  description: 'Pay for SLUTBOT AI Slutcoins with Telegram Stars or cryptocurrency.',
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

  const initialMethod: CheckoutMethod = params.method === 'crypto' ? 'crypto' : 'stars';

  return <CheckoutClient plan={plan} initialMethod={initialMethod} />;
}
