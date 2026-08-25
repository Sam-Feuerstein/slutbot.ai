'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getImageToVideoClientId } from '@/app/tool/clientId';
import { syncPurchasedDesires } from '@/lib/desires';
import { trackEvent } from '@/lib/trackClient';
import { formatUsdPrice, PREMIUM_PLANS, planBonusGenerationCopy, planBonusPercentLabel, planGenerationCopy, type PremiumPlan } from '@/lib/premiumPlans';

export type CheckoutMethod = 'stars' | 'crypto';

type Props = {
  plan: PremiumPlan;
  initialMethod: CheckoutMethod;
};

const PACKS = [...PREMIUM_PLANS].sort((a, b) => a.price - b.price);
const PRODUCT_THUMB = '/checkout/product.jpg';

function PaperPlaneIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z" />
    </svg>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className ?? 'h-3.5 w-3.5'} fill="currentColor" aria-hidden>
      <path d="M17 8h-1V6a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2zm-7-2a2 2 0 1 1 4 0v2h-4V6z" />
    </svg>
  );
}

function UsdtIcon() {
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#26a17b] text-[13px] font-black text-white">
      ₮
    </span>
  );
}

function SamsungPayMark() {
  return (
    <span className="inline-flex h-6 items-center rounded-[4px] bg-black px-2 text-[10px] font-semibold tracking-tight text-white sm:h-7 sm:text-[11px]">
      Samsung Pay
    </span>
  );
}

function WalletLogos() {
  return (
    <span className="flex flex-wrap items-center gap-1 pl-8 sm:gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/payments/wallet-logos.png"
        alt="Mastercard, Visa, Google Pay, Apple Pay"
        className="h-[22px] w-auto sm:h-7"
      />
      <SamsungPayMark />
    </span>
  );
}

function MethodCopy({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <span className="min-w-0 flex-1 text-left">
      <span className="block text-sm font-semibold">{title}</span>
      <span className="block text-xs text-[#6b6f7a]">{subtitle}</span>
    </span>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className ?? 'h-4 w-4'} fill="currentColor" aria-hidden>
      <path d="M12 2 4 5v6.5c0 5 3.4 9.4 8 10.5 4.6-1.1 8-5.5 8-10.5V5l-8-3zm-1.1 13.3-3.2-3.2 1.4-1.4 1.8 1.8 3.8-3.8 1.4 1.4-5.2 5.2z" />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className ?? 'h-4 w-4'} fill="currentColor" aria-hidden>
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-1.1 14.3-3.7-3.7 1.4-1.4 2.3 2.3 5.3-5.3 1.4 1.4-6.7 6.7z" />
    </svg>
  );
}

function TrustSignals() {
  return (
    <div role="list" className="text-[12px] leading-snug text-[#1a1a1a]">
      <div role="listitem" className="flex items-center gap-1.5 font-semibold">
        <LockIcon className="h-3.5 w-3.5 shrink-0" />
        Secure Checkout
      </div>
      <div role="listitem" className="mt-1.5 flex items-center gap-1.5">
        <ShieldIcon className="h-3.5 w-3.5 shrink-0" />
        No adult transaction in your bank statement
      </div>
      <div role="listitem" className="mt-1.5 flex items-center gap-1.5">
        <CheckCircleIcon className="h-3.5 w-3.5 shrink-0" />
        No hidden fees • 100% Anonymous
      </div>
    </div>
  );
}

export default function CheckoutClient({ plan, initialMethod }: Props) {
  const router = useRouter();
  const [planId, setPlanId] = useState(plan.id);
  const [method, setMethod] = useState<CheckoutMethod>(initialMethod);
  const [telegramName, setTelegramName] = useState('');
  const [buying, setBuying] = useState(false);
  const [note, setNote] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const selected = PREMIUM_PLANS.find((item) => item.id === planId) ?? plan;
  const payLabel = useMemo(
    () => (buying ? 'Opening…' : `Pay ${formatUsdPrice(selected.price)}`),
    [buying, selected.price],
  );

  useEffect(() => {
    trackEvent('checkout_view', { kind: 'view', plan: plan.id, method: initialMethod });
  }, [plan.id, initialMethod]);

  const selectPlan = (id: string) => {
    setPlanId(id);
    trackEvent('checkout_plan', { kind: 'click', plan: id, method });
    router.replace(`/checkout?plan=${id}&method=${method}`, { scroll: false });
  };

  const chooseMethod = (next: CheckoutMethod) => {
    setMethod(next);
    trackEvent('checkout_method', { kind: 'click', plan: planId, method: next });
    router.replace(`/checkout?plan=${planId}&method=${next}`, { scroll: false });
  };

  const startCheckout = async () => {
    trackEvent('checkout_pay', { kind: 'click', plan: selected.id, method });
    setBuying(true);
    setNote('');
    setToast(
      method === 'stars'
        ? 'Redirecting to Telegram, a secure payment...'
        : 'Redirecting to NOWPayments, a secure payment...',
    );
    try {
      const clientId = getImageToVideoClientId();
      const endpoint = method === 'stars' ? '/api/payments/stars' : '/api/payments/nowpayments';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: selected.id,
          clientId,
          telegramName: telegramName.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { url?: string; message?: string };
      if (!res.ok || !data.url) {
        setToast(null);
        setNote(data.message || 'Could not start checkout.');
        return;
      }
      window.open(data.url, '_blank');
      let ticks = 0;
      const poll = window.setInterval(() => {
        ticks += 1;
        void syncPurchasedDesires(clientId);
        if (ticks >= 120) window.clearInterval(poll);
      }, 4000);
    } catch {
      setToast(null);
      setNote('Could not start checkout.');
    } finally {
      setBuying(false);
    }
  };

  return (
    <div className="min-h-dvh overflow-x-hidden lg:grid lg:grid-cols-2" style={{ colorScheme: 'light' }}>
      {toast ? (
        <div className="fixed right-4 top-4 z-[220] max-w-[min(92vw,360px)]">
          <div
            role="status"
            className="relative flex items-center gap-3 rounded-xl border border-[#c8e6c9] bg-[#e8f5e9] px-4 py-3 pr-5 shadow-[0_8px_24px_rgba(46,125,50,0.18)]"
          >
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setToast(null)}
            className="absolute -left-2 -top-2 inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#c8e6c9] bg-[#e8f5e9] text-[11px] text-[#2e7d32]"
          >
            ×
          </button>
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#2e7d32] text-white">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" aria-hidden>
              <path d="M5 12.5 9.5 17 19 7.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <p className="text-sm font-medium text-[#1b5e20]">{toast}</p>
          </div>
        </div>
      ) : null}
      <aside className="flex flex-col bg-[#635bff] px-4 py-4 text-white sm:px-10 sm:py-8 lg:min-h-dvh lg:px-12 lg:py-10">
        <nav className="flex items-center gap-2 text-[13px] text-white/80">
          <Link
            href="/tool"
            aria-label="Back"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white hover:bg-white/10"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
              <path d="M15 6 9 12l6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <Link href="/" className="hover:text-white">
            SLUTBOT
          </Link>
          <span className="text-white/45">/</span>
          <span className="text-white">Checkout</span>
        </nav>

        <div className="mt-5 flex items-start gap-3 sm:mt-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={PRODUCT_THUMB}
            alt=""
            className="h-12 w-12 rounded-md object-cover"
          />
          <div className="min-w-0">
            <p className="text-sm text-white/80">{selected.desires.toLocaleString('en-US')} Slutcoins</p>
            <p className="text-[28px] font-semibold leading-none tracking-tight sm:text-[40px]">
              {formatUsdPrice(selected.price)}
            </p>
            <p className="mt-2 text-xs font-medium text-[#fde68a]">✨ Slutcoins never expire</p>
            <p className="mt-1.5 text-xs text-white/75">{planGenerationCopy(selected)}</p>
            {planBonusGenerationCopy(selected) ? (
              <p className="mt-1.5 text-xs font-semibold text-[#86efac]">
                Bonus: {planBonusGenerationCopy(selected)}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-5 space-y-2 sm:mt-8 sm:space-y-2.5">
          {PACKS.map((pack) => {
            const active = pack.id === selected.id;
            const bonusPercent = planBonusPercentLabel(pack);
            return (
              <button
                key={pack.id}
                type="button"
                onClick={() => selectPlan(pack.id)}
                className="flex w-full items-start gap-2.5 rounded-xl border border-white/25 px-3 py-2.5 text-left hover:border-white/45 sm:items-center sm:gap-3 sm:px-3.5 sm:py-3"
              >
                <span
                  className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border sm:mt-0 ${
                    active ? 'border-white' : 'border-white/50'
                  }`}
                >
                  {active ? <span className="h-2.5 w-2.5 rounded-full bg-white" /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="text-sm font-medium">
                      {pack.tier} · {pack.desires.toLocaleString('en-US')} Slutcoins
                    </span>
                    {bonusPercent ? (
                      <span className="inline-flex rounded-full bg-[#22c55e] px-1.5 py-px text-[10px] font-semibold leading-4 text-white">
                        {bonusPercent}
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-0.5 block text-xs leading-snug text-white/70">
                    {planGenerationCopy(pack)}
                  </span>
                </span>
                <span className="shrink-0 pt-0.5 text-sm font-medium sm:pt-0">{formatUsdPrice(pack.price)}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 border-t border-white/20 pt-4 sm:mt-5 sm:pt-5">
          <p className="text-sm text-white/85">{planGenerationCopy(selected)}</p>
          {planBonusGenerationCopy(selected) ? (
            <p className="mt-2 text-sm font-medium text-[#86efac]">
              Bonus: {planBonusGenerationCopy(selected)}
            </p>
          ) : null}
          <div className="mt-3 flex items-center justify-between gap-3 text-sm text-white/85">
            <span>Slutcoins</span>
            <span className="tabular-nums">{selected.desires.toLocaleString('en-US')}</span>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 text-base font-semibold">
            <span>Total due today</span>
            <span className="tabular-nums">{formatUsdPrice(selected.price)}</span>
          </div>
        </div>
      </aside>

      <main className="flex items-start bg-white px-4 py-5 text-[#1a1a1a] sm:px-10 sm:py-8 lg:min-h-dvh lg:px-12 lg:py-10">
        <div className="w-full max-w-[440px]">
          <div className="hidden h-8 lg:block" aria-hidden />
          <h1 className="mt-2 text-[20px] font-semibold tracking-tight text-[#1a1a1a] sm:text-[22px] lg:mt-8">
            Payment method
          </h1>

          <div className="mt-5 space-y-3">
            <button
              type="button"
              onClick={() => chooseMethod('stars')}
              className={`flex w-full flex-col gap-2.5 rounded-xl border px-3.5 py-3.5 sm:px-4 ${
                method === 'stars' ? 'border-[#635bff] ring-1 ring-[#635bff]' : 'border-[#d7dbe3] hover:border-[#b8becb]'
              }`}
            >
              <span className="flex w-full items-center gap-3">
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                    method === 'stars' ? 'border-[#635bff]' : 'border-[#c9ccd6]'
                  }`}
                >
                  {method === 'stars' ? <span className="h-2.5 w-2.5 rounded-full bg-[#635bff]" /> : null}
                </span>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2aabee] text-white">
                  <PaperPlaneIcon />
                </span>
                <MethodCopy title="Telegram Stars" subtitle="Pay with Telegram Stars" />
              </span>
              <WalletLogos />
            </button>

            {method === 'stars' ? (
              <>
                <label className="block">
                  <span className="text-sm text-[#5b616e]">Telegram name</span>
                  <input
                    type="text"
                    value={telegramName}
                    onChange={(event) => setTelegramName(event.target.value)}
                    onBlur={() => {
                      if (telegramName.trim()) {
                        trackEvent('checkout_name', { plan: planId, method: 'stars' });
                      }
                    }}
                    placeholder="Your Telegram name"
                    className="mt-2 w-full rounded-lg border border-[#d7dbe3] px-3.5 py-3 text-sm text-[#1a1a1a] outline-none placeholder:text-[#9aa0ab] focus:border-[#635bff] focus:ring-2 focus:ring-[#635bff]/20"
                  />
                </label>
                <p className="text-center">
                  <a
                    href="/payments/telegram-stars-tutorial"
                    onClick={() => trackEvent('checkout_tutorial', { kind: 'click', plan: planId, method: 'stars' })}
                    className="text-sm font-medium text-[#635bff] underline underline-offset-2 hover:text-[#4f3dff]"
                  >
                    Telegram Payment Tutorial
                  </a>
                </p>
              </>
            ) : null}

            <button
              type="button"
              onClick={() => chooseMethod('crypto')}
              className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-3.5 sm:px-4 ${
                method === 'crypto' ? 'border-[#635bff] ring-1 ring-[#635bff]' : 'border-[#d7dbe3] hover:border-[#b8becb]'
              }`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                  method === 'crypto' ? 'border-[#635bff]' : 'border-[#c9ccd6]'
                }`}
              >
                {method === 'crypto' ? <span className="h-2.5 w-2.5 rounded-full bg-[#635bff]" /> : null}
              </span>
              <UsdtIcon />
              <MethodCopy title="Crypto" subtitle="USDT TRC20 only" />
            </button>

            {method === 'crypto' ? (
              <p className="text-center">
                  <a
                    href="/payments/crypto-tutorial"
                    onClick={() => trackEvent('checkout_tutorial', { kind: 'click', plan: planId, method: 'crypto' })}
                  className="text-sm font-medium text-[#635bff] underline underline-offset-2 hover:text-[#4f3dff]"
                >
                  Nowpayment Tutorial
                </a>
              </p>
            ) : null}
          </div>

          <p className="mt-4 text-[13px] text-[#6b6f7a]">
            {method === 'stars'
              ? "You'll be securely redirected to complete Telegram Stars payment."
              : "You'll be securely redirected to NOWPayments to pay with USDT TRC20."}
          </p>

          <button
            type="button"
            disabled={buying}
            onClick={() => void startCheckout()}
            className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7a72ff] to-[#4f3dff] px-4 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(99,91,255,0.35)] hover:from-[#6e66f8] hover:to-[#4636f0] disabled:opacity-50"
          >
            {payLabel}
            <LockIcon className="h-3.5 w-3.5" />
          </button>

          <div className="mt-4">
            <TrustSignals />
          </div>

          {note ? <p className="mt-3 text-center text-xs text-[#b42318]">{note}</p> : null}
        </div>
      </main>
    </div>
  );
}
