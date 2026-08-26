'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CURRENCY_NAME, refreshDesiresFromServer } from '@/lib/desires';
import { GENERATOR_PATH } from '@/lib/site';

const BALANCE_BEFORE_KEY = 'slutbot-payment-balance-before';

export default function PaymentSuccessBanner() {
  const searchParams = useSearchParams();
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const payment = searchParams.get('payment');
    if (payment !== 'crypto_success' && payment !== 'stars_success') return;

    let cancelled = false;

    void (async () => {
      const beforeRaw = sessionStorage.getItem(BALANCE_BEFORE_KEY);
      const before = beforeRaw ? Number(beforeRaw) : NaN;
      const balance = await refreshDesiresFromServer();
      if (cancelled) return;

      sessionStorage.removeItem(BALANCE_BEFORE_KEY);

      const added = Number.isFinite(before) && balance > before ? balance - before : null;
      if (added && added > 0) {
        setMessage(
          `Payment received — ${added.toLocaleString('en-US')} ${CURRENCY_NAME} added. Balance: ${balance.toLocaleString('en-US')}.`,
        );
      } else {
        setMessage(
          `Payment received. Your balance is ${balance.toLocaleString('en-US')} ${CURRENCY_NAME}.`,
        );
      }

      const url = new URL(window.location.href);
      url.searchParams.delete('payment');
      window.history.replaceState({}, '', `${url.pathname}${url.search}`);
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  if (!message) return null;

  return (
    <div className="safe-x mx-auto max-w-[1600px] pt-3 sm:pt-4">
      <div
        role="status"
        className="flex flex-col gap-3 rounded-2xl border border-[#86efac]/40 bg-[#14532d]/80 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <p className="text-sm font-medium text-[#bbf7d0]">{message}</p>
        <div className="flex flex-wrap gap-2">
          <Link
            href={GENERATOR_PATH}
            className="inline-flex min-h-10 items-center rounded-full bg-[#ff2d78] px-4 text-xs font-bold text-white hover:bg-[#ff1a6b]"
          >
            Start generating
          </Link>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="inline-flex min-h-10 items-center rounded-full border border-white/20 px-4 text-xs font-bold text-white/85 hover:bg-white/10"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

export function rememberBalanceBeforePayment() {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(BALANCE_BEFORE_KEY, String(Number(localStorage.getItem('slutbot-desires') || '0')));
}
