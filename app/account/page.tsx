import { Suspense } from 'react';
import type { Metadata } from 'next';
import AccountClient from './AccountClient';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Account',
  description: 'Manage your AI SLUTBOT account, Slutcoin balance, and purchase history.',
  path: '/account',
  noIndex: true,
});

export default function AccountPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-[#090505] text-white">Loading…</div>
      }
    >
      <AccountClient />
    </Suspense>
  );
}
