'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { ExampleVideo } from '@/lib/exampleVideos';
import { generatorModePath } from '@/lib/site';

export default function ExploreExampleCard({
  example,
  playing = false,
  eager = false,
}: {
  example: ExampleVideo;
  playing?: boolean;
  eager?: boolean;
}) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hovering, setHovering] = useState(false);
  const active = playing || hovering;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !active) return;
    video.play().catch(() => undefined);
  }, [active]);

  const goToTool = () => {
    router.push(generatorModePath(example.video ? 'video' : 'image'));
  };

  return (
    <div
      data-preset-id={example.id}
      tabIndex={0}
      role="button"
      onClick={goToTool}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          goToTool();
        }
      }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => {
        setHovering(false);
        const video = videoRef.current;
        if (!video || playing) return;
        video.pause();
        video.currentTime = 0;
      }}
      onFocus={() => setHovering(true)}
      onBlur={() => setHovering(false)}
      className="group/item relative flex aspect-[9/16] w-full cursor-pointer select-none flex-col items-center justify-center overflow-hidden rounded-2xl bg-[#161616] text-white outline-none transition-shadow duration-300 focus-visible:ring-2 focus-visible:ring-[#ff2d78] focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]"
      aria-label="Sample result, try it yourself"
    >
      <div className="card-video-mask relative h-full w-full">
        <Image
          src={example.poster}
          alt=""
          fill
          sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
          priority={eager}
          className="pointer-events-none select-none object-cover object-top"
        />
        {active && example.video ? (
          <video
            ref={videoRef}
            src={example.video}
            poster={example.poster}
            loop
            muted
            playsInline
            autoPlay
            preload="none"
            className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover"
          />
        ) : null}
      </div>

      <div
        className={`pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent px-2.5 pb-2.5 pt-10 transition-opacity duration-200 ${
          hovering ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/80 sm:text-[11px]">
          Sample result
        </p>
      </div>

      <div
        className={`pointer-events-none absolute inset-x-0 bottom-0 flex p-2 transition-opacity duration-200 ${
          hovering ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            goToTool();
          }}
          className="pointer-events-auto flex w-full items-center justify-center rounded-full bg-[#ff2d78] px-3 py-3 text-[11px] font-black uppercase tracking-[0.08em] leading-none text-white shadow-lg shadow-[#ff2d78]/40 transition-colors hover:bg-[#ff1a6b] sm:text-sm"
        >
          Try it yourself
        </button>
      </div>
    </div>
  );
}
