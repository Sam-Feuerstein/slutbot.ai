import { Suspense } from 'react';
import type { Metadata } from 'next';
import TelegramCompleteClient from './TelegramCompleteClient';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function TelegramCompletePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-[#090505] text-white">
          Completing Telegram sign-in…
        </div>
      }
    >
      <TelegramCompleteClient />
    </Suspense>
  );
}
