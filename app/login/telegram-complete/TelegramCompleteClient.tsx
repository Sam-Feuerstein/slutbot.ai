'use client';

import { useEffect, useState } from 'react';
import BrandLogo from '../../components/BrandLogo';
import { paramsFromTelegramLocation } from '@/lib/auth/telegramLoginParse';

export default function TelegramCompleteClient() {
  const [message, setMessage] = useState('Completing Telegram sign-in…');

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    async function finish(params: Record<string, string>) {
      const res = await fetch('/api/auth/telegram/callback', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ params }),
      });

      if (cancelled) return;

      const data = (await res.json().catch(() => null)) as { redirect?: string; message?: string } | null;
      if (res.ok && data?.redirect) {
        window.location.replace(data.redirect);
        return;
      }

      setMessage(data?.message || 'Telegram sign-in failed. Please try again.');
      window.location.replace(
        '/login?error=' + encodeURIComponent(data?.message || 'Telegram sign-in failed. Please try again.'),
      );
    }

    const onHashChange = () => tick();

    const tick = () => {
      if (cancelled) return;
      const params = paramsFromTelegramLocation(window.location.search, window.location.hash);
      if (params) {
        void finish(params);
        return;
      }
      attempts += 1;
      if (attempts < 60) {
        window.setTimeout(tick, 150);
        return;
      }
      setMessage('Telegram sign-in was cancelled or expired.');
      window.location.replace('/login?error=' + encodeURIComponent('Telegram sign-in was cancelled or expired.'));
    };

    window.addEventListener('hashchange', onHashChange);
    tick();

    return () => {
      cancelled = true;
      window.removeEventListener('hashchange', onHashChange);
    };
  }, []);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#090505] px-4 py-[max(1.5rem,var(--safe-top))] text-white">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#141414] p-6 text-center shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
        <BrandLogo className="mx-auto mb-5 text-[2.15rem] sm:text-[2.4rem]" />
        <p className="text-sm text-white/70">{message}</p>
      </div>
    </div>
  );
}
