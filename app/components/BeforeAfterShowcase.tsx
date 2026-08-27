'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { X, ZoomIn } from 'lucide-react';
import type { BeforeAfterPair } from '@/lib/beforeAfterExamples';
import { BEFORE_AFTER_EXAMPLES } from '@/lib/beforeAfterExamples';
import { generatorModePath } from '@/lib/site';

function BeforeAfterImage({
  src,
  label,
  eager,
}: {
  src: string;
  label: 'Before' | 'After';
  eager?: boolean;
}) {
  const isAfter = label === 'After';

  return (
    <figure className="relative aspect-[9/16] overflow-hidden rounded-md bg-black sm:rounded-lg">
      <Image
        src={src}
        alt=""
        fill
        sizes="(max-width: 768px) 40vw, 16vw"
        priority={eager}
        className="object-cover object-top"
      />
      <figcaption
        className={`pointer-events-none absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-white ${
          isAfter ? 'bg-[#ff2d78]' : 'bg-black/70'
        }`}
      >
        {label}
      </figcaption>
    </figure>
  );
}

function BeforeAfterCard({
  pair,
  eager,
  onZoom,
}: {
  pair: BeforeAfterPair;
  eager?: boolean;
  onZoom: (pair: BeforeAfterPair) => void;
}) {
  return (
    <article className="min-w-[min(88vw,22rem)] shrink-0 snap-center sm:min-w-0">
      <button
        type="button"
        onClick={() => onZoom(pair)}
        className="group/card relative w-full cursor-zoom-in rounded-lg border border-[#ff2d78] bg-white p-2 text-left shadow-[3px_3px_0_0_#000] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff2d78] focus-visible:ring-offset-2 focus-visible:ring-offset-white sm:rounded-xl sm:p-2.5"
        aria-label="View before and after comparison"
      >
        <div className="rounded-md sm:rounded-lg">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <BeforeAfterImage src={pair.before} label="Before" eager={eager} />
            <span className="text-lg font-black text-[#ff2d78]" aria-hidden>
              →
            </span>
            <BeforeAfterImage src={pair.after} label="After" eager={eager} />
          </div>
        </div>
        <span className="pointer-events-none absolute bottom-3 right-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white opacity-0 transition-opacity group-hover/card:opacity-100">
          <ZoomIn className="h-4 w-4" />
        </span>
      </button>
    </article>
  );
}

function BeforeAfterLightbox({
  pair,
  onClose,
}: {
  pair: BeforeAfterPair;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[140] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Before and after comparison preview"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-[max(1rem,var(--safe-top))] inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white hover:bg-white/10"
        aria-label="Close preview"
      >
        <X className="h-5 w-5" />
      </button>

      <div
        className="flex max-h-[min(92dvh,900px)] max-w-[min(96vw,920px)] flex-col items-center"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-white/70">Before / After</p>
        {pair.combined ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={pair.combined}
            alt=""
            className="max-h-[min(86dvh,820px)] w-auto max-w-full rounded-2xl object-contain shadow-2xl"
          />
        ) : (
          <div className="flex max-h-[min(86dvh,820px)] max-w-full items-center gap-3 sm:gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pair.before}
              alt=""
              className="max-h-[min(86dvh,820px)] w-auto max-w-[min(42vw,380px)] rounded-2xl object-contain shadow-2xl"
            />
            <span className="shrink-0 text-2xl font-black text-[#ff2d78]" aria-hidden>
              →
            </span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pair.after}
              alt=""
              className="max-h-[min(86dvh,820px)] w-auto max-w-[min(42vw,380px)] rounded-2xl object-contain shadow-2xl"
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function BeforeAfterShowcase({
  pairs = BEFORE_AFTER_EXAMPLES,
}: {
  pairs?: BeforeAfterPair[];
}) {
  const [zoomPair, setZoomPair] = useState<BeforeAfterPair | null>(null);
  const closeZoom = useCallback(() => setZoomPair(null), []);

  return (
    <section className="rounded-2xl border border-black/10 bg-white px-4 py-6 sm:rounded-[28px] sm:px-8 sm:py-8 lg:px-10 lg:py-10">
      <h2 className="mb-5 text-[1.15rem] font-extrabold leading-[1.18] tracking-tight text-black sm:mb-7 sm:text-[1.45rem] lg:text-[1.7rem]">
        Some before / after nude image generation by{' '}
        <span className="text-[#ff2d78]">AI SLUTBOT</span>.
      </h2>

      <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2 snap-x snap-mandatory scrollbar-none sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 md:grid-cols-3 md:gap-x-6 md:gap-y-10">
        {pairs.map((pair, index) => (
          <BeforeAfterCard key={pair.id} pair={pair} eager={index < 2} onZoom={setZoomPair} />
        ))}
      </div>

      <div className="mt-7 flex justify-center sm:mt-9">
        <Link
          href={generatorModePath('image')}
          className="inline-flex min-h-14 w-full max-w-lg items-center justify-center rounded-md border-[2.5px] border-black bg-[#ff2d78] px-8 py-4 text-center text-[14px] font-black uppercase tracking-[0.1em] text-white shadow-[4px_4px_0_0_#000] transition-[transform,box-shadow] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0_0_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none sm:min-h-16 sm:w-auto sm:px-10 sm:text-[15px]"
        >
          GENERATE YOURS
        </Link>
      </div>

      {zoomPair ? <BeforeAfterLightbox pair={zoomPair} onClose={closeZoom} /> : null}
    </section>
  );
}
