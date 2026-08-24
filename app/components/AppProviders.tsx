'use client';

import dynamic from 'next/dynamic';

const PremiumPlansModal = dynamic(() => import('./PremiumPlansModal'), {
  ssr: false,
});

const AgeConsentGate = dynamic(() => import('./AgeConsentGate'), {
  ssr: false,
});

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <AgeConsentGate />
      <PremiumPlansModal />
    </>
  );
}
