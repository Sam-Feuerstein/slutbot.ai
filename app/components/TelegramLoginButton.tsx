'use client';

import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    onTelegramAuth?: (user: Record<string, string | number>) => void;
  }
}

type Props = {
  redirect: string;
  label: string;
};

export default function TelegramLoginButton({ redirect, label }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const configRes = await fetch('/api/auth/telegram/config', { credentials: 'same-origin' });
        const config = (await configRes.json()) as { botUsername?: string; enabled?: boolean; message?: string };
        if (cancelled) return;

        if (!configRes.ok || !config.enabled || !config.botUsername) {
          setStatus('error');
          setError(config.message || 'Telegram sign-in is not available.');
          return;
        }

        const mount = containerRef.current;
        if (!mount || cancelled) return;

        window.onTelegramAuth = async (user) => {
          try {
            const res = await fetch('/api/auth/telegram/callback', {
              method: 'POST',
              credentials: 'same-origin',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ params: user, redirect }),
            });
            const data = (await res.json().catch(() => null)) as { redirect?: string; message?: string } | null;
            if (res.ok && data?.redirect) {
              window.location.replace(data.redirect);
              return;
            }
            window.location.replace(
              '/login?error=' + encodeURIComponent(data?.message || 'Telegram sign-in failed. Please try again.'),
            );
          } catch {
            window.location.replace(
              '/login?error=' + encodeURIComponent('Telegram sign-in failed. Please try again.'),
            );
          }
        };

        const script = document.createElement('script');
        script.src = 'https://telegram.org/js/telegram-widget.js?22';
        script.async = true;
        script.setAttribute('data-telegram-login', config.botUsername);
        script.setAttribute('data-size', 'large');
        script.setAttribute('data-radius', '999');
        script.setAttribute('data-onauth', 'onTelegramAuth(user)');
        script.setAttribute('data-request-access', 'write');
        script.setAttribute('data-userpic', 'false');
        mount.appendChild(script);
        setStatus('ready');
      } catch {
        if (!cancelled) {
          setStatus('error');
          setError('Telegram sign-in is not available.');
        }
      }
    }

    void init();

    return () => {
      cancelled = true;
      delete window.onTelegramAuth;
      containerRef.current?.replaceChildren();
    };
  }, [redirect]);

  if (status === 'error') {
    return <p className="mt-3 text-center text-sm text-[#ffb0c8]">{error}</p>;
  }

  return (
    <div className="mt-3 w-full">
      {status === 'loading' ? (
        <div
          className="flex w-full items-center justify-center gap-2.5 rounded-full bg-[#229ED9] py-3.5 text-sm font-bold text-white opacity-80"
          aria-hidden
        >
          {label}
        </div>
      ) : null}
      <div
        ref={containerRef}
        className={`flex w-full justify-center [&>iframe]:min-h-[44px] [&>iframe]:w-full [&>iframe]:max-w-full ${status === 'loading' ? 'sr-only' : ''}`}
        aria-label={label}
      />
    </div>
  );
}
