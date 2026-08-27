'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import PostHogPageView from './PostHogPageView';
import SessionSync from './SessionSync';
import GenerationJobsProvider from './GenerationJobsProvider';

const AgeConsentGate = dynamic(() => import('./AgeConsentGate'), {
  ssr: false,
});
const PwaInstallBanner = dynamic(() => import('./PwaInstallBanner'), {
  ssr: false,
});
const AdminSaleAlert = dynamic(() => import('./AdminSaleAlert'), {
  ssr: false,
});

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <GenerationJobsProvider>
      {children}
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      <SessionSync />
      <Suspense fallback={null}>
        <AdminSaleAlert />
      </Suspense>
      <PwaInstallBanner />
      <AgeConsentGate />
    </GenerationJobsProvider>
  );
}
