'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import PostHogPageView from './PostHogPageView';
import SessionSync from './SessionSync';

const AgeConsentGate = dynamic(() => import('./AgeConsentGate'), {
  ssr: false,
});
const PwaInstallBanner = dynamic(() => import('./PwaInstallBanner'), {
  ssr: false,
});

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      <SessionSync />
      <PwaInstallBanner />
      <AgeConsentGate />
    </>
  );
}
