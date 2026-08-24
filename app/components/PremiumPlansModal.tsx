'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Star, X } from 'lucide-react';
import { OPEN_PREMIUM_EVENT, syncPurchasedDesires } from '@/lib/desires';
import { DEFAULT_PLAN_INDEX, PREMIUM_PLANS, formatUsdPrice, type PlanFeatureState } from '@/lib/premiumPlans';
import { getImageToVideoClientId } from '@/app/tool/clientId';

function PotionIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 80" className={className} fill="none" aria-hidden>
      <path
        d="M22 8h20l-4 14h-12L22 8Z"
        fill="url(#potion-top)"
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="1.5"
      />
      <path
        d="M16 28h32l-6 44c-1 4-5 6-10 6s-9-2-10-6L16 28Z"
        fill="url(#potion-body)"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="1.5"
      />
      <ellipse cx="32" cy="52" rx="10" ry="14" fill="rgba(255,45,120,0.35)" />
      <defs>
        <linearGradient id="potion-top" x1="22" y1="8" x2="42" y2="22">
          <stop stopColor="#5b1a33" />
          <stop offset="1" stopColor="#2a0f1c" />
        </linearGradient>
        <linearGradient id="potion-body" x1="16" y1="28" x2="48" y2="78">
          <stop stopColor="#3a1022" />
          <stop offset="1" stopColor="#12060c" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function FeatureIcon({ state }: { state: PlanFeatureState }) {
  if (state === 'star') {
    return <Star className="mt-0.5 h-3.5 w-3.5 shrink-0 fill-[#f5c451] text-[#f5c451]" />;
  }
  if (state === 'check') {
    return <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/45" />;
  }
  return <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/25" />;
}

export default function PremiumPlansModal() {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(DEFAULT_PLAN_INDEX >= 0 ? DEFAULT_PLAN_INDEX : 0);
  const [trackOffset, setTrackOffset] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const [buyingNote, setBuyingNote] = useState('');
  const [buying, setBuying] = useState<'nowpayments' | 'stars' | null>(null);
  const pollRef = useRef<number | null>(null);

  const goPrev = useCallback(() => {
    setActiveIndex((index) => (index - 1 + PREMIUM_PLANS.length) % PREMIUM_PLANS.length);
  }, []);

  const goNext = useCallback(() => {
    setActiveIndex((index) => (index + 1) % PREMIUM_PLANS.length);
  }, []);

  const onTouchStart = (event: React.TouchEvent) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };

  const onTouchEnd = (event: React.TouchEvent) => {
    const start = touchStartX.current;
    const end = event.changedTouches[0]?.clientX;
    touchStartX.current = null;
    if (start == null || end == null) return;
    const delta = end - start;
    if (Math.abs(delta) < 40) return;
    if (delta < 0) goNext();
    else goPrev();
  };

  useEffect(() => {
    const onOpen = () => {
      setActiveIndex(DEFAULT_PLAN_INDEX >= 0 ? DEFAULT_PLAN_INDEX : 0);
      setOpen(true);
    };
    window.addEventListener(OPEN_PREMIUM_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_PREMIUM_EVENT, onOpen);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    const updateOffset = () => {
      const track = trackRef.current;
      if (!track?.parentElement) return;
      const slide = track.children[activeIndex] as HTMLElement | undefined;
      if (!slide) return;
      const containerWidth = track.parentElement.offsetWidth;
      const slideCenter = slide.offsetLeft + slide.offsetWidth / 2;
      setTrackOffset(containerWidth / 2 - slideCenter);
    };

    updateOffset();
    window.addEventListener('resize', updateOffset);
    return () => window.removeEventListener('resize', updateOffset);
  }, [activeIndex, open]);

  const checkout = async (provider: 'nowpayments' | 'stars') => {
    const plan = PREMIUM_PLANS[activeIndex];
    if (!plan) return;
    setBuying(provider);
    setBuyingNote('');
    try {
      const clientId = getImageToVideoClientId();
      const endpoint = provider === 'stars' ? '/api/payments/stars' : '/api/payments/nowpayments';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: plan.id, clientId }),
      });
      const data = (await res.json()) as { url?: string; message?: string };
      if (!res.ok || !data.url) {
        setBuyingNote(data.message || 'Could not start checkout.');
        return;
      }
      window.open(data.url, '_blank');
      setBuyingNote(
        provider === 'stars'
          ? 'Pay in Telegram with the Erogram VIP bot. Slutcoins land here after Telegram confirms.'
          : 'Pay with crypto (same NOWPayments account as Erogram). Slutcoins land here after the payment finishes.',
      );
      if (pollRef.current) window.clearInterval(pollRef.current);
      let ticks = 0;
      pollRef.current = window.setInterval(() => {
        ticks += 1;
        void syncPurchasedDesires(clientId);
        if (ticks >= 120 && pollRef.current) {
          window.clearInterval(pollRef.current);
          pollRef.current = null;
        }
      }, 4000);
    } catch {
      setBuyingNote('Could not start checkout.');
    } finally {
      setBuying(null);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[130] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/80 sm:backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      <div className="relative max-h-[min(100dvh,760px)] w-full max-w-5xl overflow-y-auto rounded-t-2xl border border-white/10 bg-[#0b0b0b] px-3 pb-[max(1.25rem,var(--safe-bottom))] pt-5 shadow-2xl sm:rounded-2xl sm:px-4 sm:py-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-black tracking-tight text-white sm:text-2xl">Premium plans</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative">
          <button
            type="button"
            aria-label="Previous plan"
            onClick={goPrev}
            className="absolute left-2 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-white text-black shadow-lg transition-transform hover:scale-105 sm:left-4"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <button
            type="button"
            aria-label="Next plan"
            onClick={goNext}
            className="absolute right-2 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-white text-black shadow-lg transition-transform hover:scale-105 sm:right-4"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div
            className="overflow-hidden py-2"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <div
              ref={trackRef}
              className="flex gap-3 transition-transform duration-300 ease-out will-change-transform"
              style={{ transform: `translateX(${trackOffset}px)` }}
            >
              {PREMIUM_PLANS.map((plan, index) => {
                const isActive = index === activeIndex;
                return (
                  <div key={plan.id} className="w-[min(300px,78vw)] shrink-0 sm:w-[300px]">
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setActiveIndex(index)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setActiveIndex(index);
                        }
                      }}
                      className={`relative flex min-h-0 w-full cursor-pointer flex-col rounded-2xl border bg-[#141414] p-4 text-left transition-all duration-300 sm:min-h-[560px] sm:p-5 ${
                        isActive
                          ? 'scale-100 border-[#ff2d78]/70 opacity-100 shadow-[0_0_32px_rgba(255,45,120,0.25)]'
                          : 'scale-[0.94] border-white/10 opacity-55 hover:opacity-75'
                      }`}
                    >
                      {plan.badge ? (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          <span className="rounded-full bg-[#ff2d78] px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-white">
                            {plan.badge}
                          </span>
                        </div>
                      ) : null}

                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-3xl font-black tracking-tight text-white">
                            {plan.desires.toLocaleString()} Slutcoins
                          </p>
                      <p className="mt-1 text-sm text-white/45">
                        {formatUsdPrice(plan.price)} per pack · {plan.stars.toLocaleString()} Stars
                      </p>
                        </div>
                        <PotionIcon className="h-16 w-12 shrink-0 opacity-90" />
                      </div>

                      <p className="mt-4 text-sm font-semibold text-white/55">
                        {plan.subtitle ? (
                          <>
                            <span className="block text-[11px] uppercase tracking-wider text-white/35">
                              {plan.subtitle}
                            </span>
                            {plan.tier}
                          </>
                        ) : (
                          plan.tier
                        )}
                      </p>

                      <ul className="mt-4 flex-1 space-y-2.5">
                        {plan.features.map((feature) => (
                          <li
                            key={feature.label}
                            className="flex items-start gap-2.5 text-[13px] leading-snug text-white/80"
                          >
                            <FeatureIcon state={feature.state} />
                            <span className={feature.state === 'off' ? 'text-white/35' : ''}>
                              {feature.label}
                            </span>
                          </li>
                        ))}
                      </ul>

                      <p className="mt-4 text-center text-xs leading-relaxed text-white/45">
                        You get {plan.imageGenerations.toLocaleString()} image generations or{' '}
                        {plan.videoGenerations.toLocaleString()} 5-second{' '}
                        {plan.videoGenerations === 1 ? 'video' : 'videos'}
                      </p>

                      <p className="mt-2 text-center text-xs font-medium text-[#f5c451]">
                        ✨ Slutcoins never expire
                      </p>

                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void checkout('nowpayments');
                          }}
                          disabled={buying !== null}
                          className="min-h-11 rounded-full bg-[#ff2d78] py-3 text-xs font-extrabold text-white hover:bg-[#ff1a6b] disabled:opacity-50"
                        >
                          {buying === 'nowpayments' ? 'Opening…' : `Crypto · ${formatUsdPrice(plan.price)}`}
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void checkout('stars');
                          }}
                          disabled={buying !== null}
                          className="min-h-11 rounded-full border border-white/15 bg-white/10 py-3 text-xs font-extrabold text-white hover:bg-white/15 disabled:opacity-50"
                        >
                          {buying === 'stars' ? 'Opening…' : `Stars · ${plan.stars.toLocaleString()}`}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-center gap-2">
          {PREMIUM_PLANS.map((plan, index) => (
            <button
              key={plan.id}
              type="button"
              aria-label={`Go to ${plan.tier}`}
              onClick={() => setActiveIndex(index)}
              className={`h-2 rounded-full transition-all ${
                index === activeIndex ? 'w-6 bg-[#ff2d78]' : 'w-2 bg-white/20'
              }`}
            />
          ))}
        </div>

        <p className="mt-4 text-center text-xs text-white/35">
          Crypto uses Erogram&apos;s NOWPayments account. Stars use the Erogram VIP bot as packs named SLUTBOT
          Ecstasy, Passion, Desire, Flirt, and Tease.
        </p>
        {buyingNote ? <p className="mt-2 text-center text-xs text-[#ffb0c8]">{buyingNote}</p> : null}
      </div>
    </div>
  );
}
