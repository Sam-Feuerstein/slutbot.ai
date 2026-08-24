import { Suspense } from 'react';
import type { Metadata } from 'next';
import OauthCompleteClient from './OauthCompleteClient';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function OauthCompletePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-[#090505] text-white">
          Completing Google sign-in…
        </div>
      }
    >
      <OauthCompleteClient />
    </Suspense>
  );
}
