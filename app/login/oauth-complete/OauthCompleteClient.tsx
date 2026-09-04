'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import BrandLogo from '../../components/BrandLogo';
import { cacheUserProfile } from '@/lib/auth/profile';
import { storeAuthSession } from '@/lib/auth/session';
import { safeNextPath } from '@/lib/site';

export default function OauthCompleteClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = safeNextPath(searchParams.get('redirect'));
  const [message, setMessage] = useState('Completing Google sign-in…');

  useEffect(() => {
    let cancelled = false;

    async function complete() {
      try {
        const res = await fetch('/api/auth/google/complete', { credentials: 'include' });
        const data = (await res.json()) as {
          clientId?: string;
          email?: string;
          name?: string;
          avatarUrl?: string;
          desires?: number;
          trialCredits?: number;
          message?: string;
        };

        if (cancelled) return;

        if (!res.ok || !data.clientId) {
          setMessage(data.message || 'Google sign-in failed.');
          return;
        }

        storeAuthSession({ clientId: data.clientId });
        cacheUserProfile({
          email: data.email || '',
          name: data.name || '',
          avatarUrl: data.avatarUrl || '',
        });
        localStorage.setItem('slutbot-desires', String(data.desires ?? 0));
        localStorage.setItem('slutbot-desires-server', String(data.desires ?? 0));
        localStorage.setItem('slutbot-trial-credits', '0');
        window.dispatchEvent(new CustomEvent('slutbot:desires-updated'));
        router.replace(redirect);
      } catch {
        if (!cancelled) {
          setMessage('Google sign-in failed.');
        }
      }
    }

    void complete();

    return () => {
      cancelled = true;
    };
  }, [redirect, router]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#090505] px-4 py-[max(1.5rem,var(--safe-top))] text-white">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#141414] p-6 text-center shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
        <BrandLogo className="mx-auto mb-5 h-[51px] w-auto" />
        <p className="text-sm text-white/70">{message}</p>
      </div>
    </div>
  );
}
