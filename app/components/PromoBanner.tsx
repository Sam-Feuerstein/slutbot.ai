'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { prefersReducedMedia } from '@/lib/media/autoplay';
import { generatorModePath } from '@/lib/site';

const DEMO_1_POSTER = '/examples/example-ex-1.jpg';
const DEMO_1_VIDEO = '/examples/example-ex-1.mp4';
const DEMO_2_POSTER = '/examples/example-ex-2.jpg';
const DEMO_2_VIDEO = '/examples/example-ex-2.mp4';

const STEPS = ['Upload photo', 'Generate video or image', 'Save it.'] as const;

function DemoVideo({
  poster,
  videoSrc,
  priority = false,
  autoplay = false,
}: {
  poster: string;
  videoSrc: string;
  priority?: boolean;
  autoplay?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playVideo, setPlayVideo] = useState(false);

  useEffect(() => {
    if (!videoSrc || !autoplay || prefersReducedMedia()) return;
    setPlayVideo(true);
  }, [videoSrc, autoplay]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playVideo) return;
    video.play().catch(() => undefined);
  }, [playVideo]);

  return (
    <figure className="min-w-0 flex-1">
      <div className="relative overflow-hidden rounded-lg border-[4px] border-[#ff2d78] bg-[#ff2d78] p-1 shadow-[5px_5px_0_0_#000] sm:rounded-xl sm:border-[5px] sm:p-1.5 sm:shadow-[6px_6px_0_0_#000]">
        <div className="relative aspect-[3/4] overflow-hidden rounded-md bg-black sm:rounded-lg">
          <Image
            src={poster}
            alt=""
            fill
            sizes="(max-width: 1024px) 42vw, 280px"
            priority={priority}
            className="object-cover object-top"
          />
          {playVideo ? (
            <video
              ref={videoRef}
              src={videoSrc}
              poster={poster}
              autoPlay
              loop
              muted
              playsInline
              preload="none"
              className="absolute inset-0 h-full w-full object-cover object-top"
              aria-hidden
            />
          ) : null}
        </div>
      </div>
    </figure>
  );
}

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

export default function PromoBanner() {
  const [playSecond, setPlaySecond] = useState(false);

  useEffect(() => {
    if (prefersReducedMedia()) return;
    const desktop = window.matchMedia('(min-width: 768px)');
    const update = () => setPlaySecond(desktop.matches);
    update();
    desktop.addEventListener('change', update);
    return () => desktop.removeEventListener('change', update);
  }, []);

  return (
    <section className="overflow-hidden rounded-2xl border border-black/10 bg-white px-4 py-6 sm:rounded-[28px] sm:px-8 sm:py-8 lg:px-10 lg:py-10">
      <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-10">
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <DemoVideo poster={DEMO_1_POSTER} videoSrc={DEMO_1_VIDEO} priority autoplay />
          <DemoVideo poster={DEMO_2_POSTER} videoSrc={DEMO_2_VIDEO} autoplay={playSecond} />
        </div>

        <div className="min-w-0">
          <h1 className="text-[1.28rem] font-extrabold leading-[1.18] tracking-tight text-white sm:text-[1.75rem] lg:text-[2rem]">
            <span className="relative inline-block">
              <span
                aria-hidden
                className="pointer-events-none absolute -left-1 -right-1 bottom-[0.08em] top-[0.22em] -skew-y-1 rounded-[3px] bg-black shadow-[2px_3px_0_rgba(0,0,0,0.28)] sm:-left-1.5 sm:-right-1.5 sm:bottom-[0.1em] sm:top-[0.2em]"
              />
              <span className="relative px-0.5">#1 Nude image and Video Generator</span>
            </span>
          </h1>

          <div className="mt-5 sm:mt-6">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#ff2d78]">
              Easy steps
            </p>
            <ol className="mt-2.5 space-y-2">
              {STEPS.map((step, index) => (
                <li key={step} className="flex items-center gap-2.5 text-sm text-black/80 sm:text-base">
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#ff2d78] text-[11px] font-black text-white">
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:mt-7 sm:flex-row sm:flex-wrap">
            <Link
              href={generatorModePath('video')}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md border-[2.5px] border-black bg-[#ffe600] px-5 py-3 text-center text-[12px] font-black uppercase tracking-[0.08em] text-black shadow-[3px_3px_0_0_#000] transition-[transform,box-shadow] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_#000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none sm:w-auto"
            >
              <SparkleIcon className="h-4 w-4 shrink-0" />
              Try Undress AI Videos
            </Link>
            <Link
              href={generatorModePath('image')}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md border-[2.5px] border-black bg-[#ff2d78] px-5 py-3 text-center text-[12px] font-black uppercase tracking-[0.08em] text-white shadow-[3px_3px_0_0_#000] transition-[transform,box-shadow] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_#000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none sm:w-auto"
            >
              <SparkleIcon className="h-4 w-4 shrink-0" />
              Try Undress AI Images
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
