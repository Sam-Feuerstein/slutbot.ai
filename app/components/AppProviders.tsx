'use client';

import dynamic from 'next/dynamic';

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
      <PwaInstallBanner />
      <AgeConsentGate />
    </>
  );
}
