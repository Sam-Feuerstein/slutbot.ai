'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { ExampleVideo } from '@/lib/exampleVideos';
import {
  CURRENCY_NAME,
  DESIRES_UPDATED_EVENT,
  formatDesireBalance,
  getAuthToken,
  getDesires,
  samplePreviewGeneration,
} from '@/lib/desires';
import { sampleRefTag } from '@/lib/samples/refTag';

export default function ExploreExampleLightbox({
  example,
  index,
  total,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  onClose,
  onTry,
}: {
  example: ExampleVideo;
  index: number;
  total: number;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
  onTry: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const beforeSrc = example.source || example.poster;
  const isVideo = Boolean(example.video);
  const generation = samplePreviewGeneration(isVideo);
  const refTag = sampleRefTag(example.id);
  const [signedIn, setSignedIn] = useState(false);
  const [balance, setBalance] = useState(0);

  const refreshWallet = useCallback(() => {
    setSignedIn(Boolean(getAuthToken()));
    setBalance(getDesires());
  }, []);

  useEffect(() => {
    refreshWallet();
    const onWallet = () => refreshWallet();
    window.addEventListener(DESIRES_UPDATED_EVENT, onWallet);
    return () => {
      window.removeEventListener(DESIRES_UPDATED_EVENT, onWallet);
    };
  }, [refreshWallet]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key === 'ArrowLeft' && hasPrev) {
        event.preventDefault();
        onPrev();
        return;
      }
      if (event.key === 'ArrowRight' && hasNext) {
        event.preventDefault();
        onNext();
      }
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose, onPrev, onNext, hasPrev, hasNext]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !example.video) return;
    video.load();
    video.play().catch(() => undefined);
  }, [example.id, example.video]);

  const canAfford = !signedIn || balance >= generation.cost;

  return (
    <div
      className="fixed inset-0 z-[140] flex items-center justify-center bg-black/80 p-3 backdrop-blur-md sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Sample preview"
    >
      <div
        className="flex max-w-[min(100%,calc(33.75rem+5.5rem))] items-center gap-1.5 sm:max-w-[calc(39rem+6.5rem)] sm:gap-2"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onPrev}
          disabled={!hasPrev}
          aria-label="Previous sample"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/50 text-white transition-colors hover:bg-white/10 disabled:pointer-events-none disabled:opacity-25 sm:h-11 sm:w-11"
        >
          <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>

        <div
          className="min-w-0 flex-1 overflow-hidden rounded-2xl border border-[#ff2d78]/35 bg-[#1a0a12] shadow-[0_24px_80px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,45,120,0.12)]"
        >
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3.5 py-2.5 sm:px-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/55 sm:text-[11px]">
              Original → Result
              <span className="ml-2 tabular-nums text-white/75">{refTag}</span>
              <span className="ml-2 tabular-nums text-white/35">
                {index + 1}/{total}
              </span>
            </p>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/5 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Close preview"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 pt-3 sm:gap-2.5 sm:px-4 sm:pt-3.5">
            <figure className="relative aspect-[9/16] min-w-0 overflow-hidden rounded-xl border border-white/12 bg-black shadow-inner">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={beforeSrc} alt="" className="h-full w-full object-cover object-top" />
              <figcaption
                className="pointer-events-none absolute left-1.5 top-1.5 rounded-full bg-black/65 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.12em] text-white sm:text-[10px]"
              >
                Original
              </figcaption>
            </figure>

            <span className="shrink-0 text-base font-black text-[#ff2d78] sm:text-lg" aria-hidden>
              →
            </span>

            {example.video ? (
              <figure className="relative aspect-[9/16] min-w-0 overflow-hidden rounded-xl border border-[#ff2d78]/35 bg-black shadow-inner">
                <video
                  ref={videoRef}
                  key={example.id}
                  src={example.video}
                  poster={example.poster}
                  loop
                  muted
                  playsInline
                  autoPlay
                  className="h-full w-full object-cover object-top"
                />
                <figcaption
                  className="pointer-events-none absolute left-1.5 top-1.5 rounded-full bg-[#ff2d78] px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.12em] text-white sm:text-[10px]"
                >
                  Result
                </figcaption>
              </figure>
            ) : (
              <figure className="relative aspect-[9/16] min-w-0 overflow-hidden rounded-xl border border-white/12 bg-black/40" />
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-1.5 px-3 pt-2.5 sm:gap-2 sm:px-4">
            {generation.durationSec ? (
              <span className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-white/70">
                {generation.durationSec} sec
              </span>
            ) : null}
            {generation.qualityLabel ? (
              <span className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-white/70">
                {generation.qualityLabel}
              </span>
            ) : null}
            <span className="rounded-full border border-[#ff2d78]/35 bg-[#ff2d78]/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#ff9dbe]">
              {generation.cost} {CURRENCY_NAME}
            </span>
          </div>

          <div className="px-3 pb-3 pt-2 sm:px-4 sm:pb-4 sm:pt-2.5">
            <button
              type="button"
              onClick={onTry}
              className="flex h-11 w-full flex-col items-center justify-center gap-0.5 rounded-xl border-[2.5px] border-black bg-[#ff2d78] px-3 text-white shadow-[3px_3px_0_0_#000] transition-[transform,box-shadow,background-color] hover:translate-x-[0.5px] hover:translate-y-[0.5px] hover:bg-[#ff4d90] hover:shadow-[2px_2px_0_0_#000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none sm:h-12"
            >
              <span className="text-[12px] font-black uppercase tracking-[0.1em] sm:text-[13px]">
                {signedIn ? `Try it · ${generation.cost} ${CURRENCY_NAME}` : 'Try it'}
              </span>
              {signedIn ? (
                <span
                  className={`text-[10px] font-semibold normal-case tracking-normal sm:text-[11px] ${
                    canAfford ? 'text-white/80' : 'text-amber-200'
                  }`}
                >
                  Your balance: {formatDesireBalance(balance)} {CURRENCY_NAME}
                  {!canAfford ? ' · need more' : ''}
                </span>
              ) : null}
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={onNext}
          disabled={!hasNext}
          aria-label="Next sample"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/50 text-white transition-colors hover:bg-white/10 disabled:pointer-events-none disabled:opacity-25 sm:h-11 sm:w-11"
        >
          <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>
      </div>
    </div>
  );
}
