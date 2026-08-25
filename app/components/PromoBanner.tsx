'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { GENERATOR_PATH } from '@/lib/site';
import { uiMediaUrl } from '@/lib/presetMedia';

const BANNER_VIDEO = uiMediaUrl('ui/banner-bg.mp4') || '/mock/spicybox/banner-bg-new.mp4';
const BANNER_POSTER = '/brand/banner-poster.webp';

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 22 22"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M17.852 1.072c-.112.06-.16.16-.288.582-.261.866-.297.943-.574 1.215-.248.243-.3.269-.993.488-.703.222-.734.238-.802.4-.079.188-.043.345.11.48.05.045.339.155.64.243.689.202.852.284 1.103.557.215.233.274.367.517 1.173.143.475.166.518.325.594s.185.075.34 0c.186-.087.208-.134.482-1.02.255-.82.468-1.004 1.551-1.33.61-.185.737-.274.737-.513 0-.285-.132-.376-.847-.583-.983-.285-1.19-.476-1.467-1.358-.246-.784-.273-.849-.393-.933-.13-.09-.267-.09-.44.005M9.97 2.535a.7.7 0 0 0-.206.159c-.06.065-.407.936-.791 1.983-.795 2.17-.879 2.366-1.24 2.906a5.8 5.8 0 0 1-2.088 1.9c-.234.124-1.283.539-2.332.922s-1.958.729-2.02.77c-.373.244-.393.863-.035 1.097.061.04.982.394 2.046.785 1.065.391 2.059.774 2.21.85a6.2 6.2 0 0 1 2.038 1.714c.425.574.64 1.048 1.368 3.035.392 1.068.748 1.996.79 2.061.095.144.373.283.567.283.172 0 .432-.151.537-.313.043-.065.336-.822.65-1.682.315-.86.632-1.72.705-1.911.4-1.058 1.008-1.898 1.83-2.533.82-.632.964-.695 4.718-2.054.588-.213.744-.354.778-.703.026-.274-.069-.511-.25-.628-.062-.04-.728-.295-1.481-.569-2.21-.801-2.498-.913-2.839-1.094a5.9 5.9 0 0 1-2.353-2.27c-.22-.376-.349-.7-1.136-2.852-.608-1.663-.62-1.692-.814-1.81-.159-.096-.476-.119-.652-.046"
      />
    </svg>
  );
}

function canAutoplayBanner() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  if ((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData) return false;
  if (window.matchMedia('(max-width: 767px)').matches) return false;
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

export default function PromoBanner() {
  const sectionRef = useRef<HTMLElement>(null);
  const [loadVideo, setLoadVideo] = useState(false);

  useEffect(() => {
    if (!canAutoplayBanner()) return;
    const root = sectionRef.current;
    if (!root) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setLoadVideo(true);
          io.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    io.observe(root);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-black sm:rounded-[28px]"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={BANNER_POSTER}
        alt=""
        width={900}
        height={502}
        decoding="async"
        fetchPriority="high"
        className="absolute inset-0 h-full w-full object-cover object-center"
      />

      {loadVideo ? (
        <video
          src={BANNER_VIDEO}
          autoPlay
          loop
          muted
          playsInline
          preload="none"
          poster={BANNER_POSTER}
          className="absolute inset-0 h-full w-full object-cover object-center"
          aria-hidden
        />
      ) : null}

      <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/15" aria-hidden />
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" aria-hidden />

      <div className="relative z-10 flex min-h-[200px] flex-col justify-center px-4 py-6 sm:min-h-[260px] sm:px-10 sm:py-10 lg:min-h-[300px] lg:max-w-[62%] lg:px-12">
        <h1 className="text-[1.28rem] font-extrabold uppercase leading-[1.12] tracking-tight text-white sm:text-[1.75rem] lg:text-[2rem]">
          Upload any photo of her and get a hot 18+ video in just 2 minutes 🔥
        </h1>

        <p className="mt-3 max-w-lg text-sm text-white/75 sm:text-base">
          Give it a try. Generate your AI Slut Bot!
        </p>

        <Link
          href={GENERATOR_PATH}
          className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2.5 rounded-full bg-white px-6 py-3 text-sm font-extrabold uppercase tracking-wide text-[#ff2d78] shadow-[0_8px_32px_rgba(0,0,0,0.35)] transition-transform hover:bg-white/95 active:scale-[0.99] sm:mt-6 sm:w-fit sm:hover:scale-[1.02]"
        >
          <SparkleIcon className="h-5 w-5 shrink-0" />
          Generate now
        </Link>
      </div>
    </section>
  );
}
