'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { ExampleVideo } from '@/lib/exampleVideos';
import { isRemoteMedia } from '@/lib/media/image';
import { trackSampleClick } from '@/lib/samples/client';
import { sampleRefTag } from '@/lib/samples/refTag';
import { generatorModePath } from '@/lib/site';
import AdminSampleDeleteButton from './AdminSampleDeleteButton';

export default function ExploreExampleCard({
  example,
  playing = false,
  eager = false,
  onOpenPreview,
  showAdminDelete = false,
}: {
  example: ExampleVideo;
  playing?: boolean;
  eager?: boolean;
  onOpenPreview?: () => void;
  showAdminDelete?: boolean;
}) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hovering, setHovering] = useState(false);
  const active = playing || hovering;
  const refTag = sampleRefTag(example.id);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !active) return;
    video.play().catch(() => undefined);
  }, [active]);

  const goToTool = () => {
    trackSampleClick(example.id);
    router.push(generatorModePath(example.video ? 'video' : 'image', example.id));
  };

  const openPreview = () => {
    if (onOpenPreview) {
      onOpenPreview();
      return;
    }
    trackSampleClick(example.id);
    goToTool();
  };

  return (
    <div
      data-preset-id={example.id}
      tabIndex={0}
      role="button"
      onClick={openPreview}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openPreview();
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
      aria-label={`${refTag}, try it yourself`}
    >
      {showAdminDelete ? (
        <AdminSampleDeleteButton
          sampleId={example.id}
          title={example.title || refTag}
          className="absolute right-2 top-2 z-20"
        />
      ) : null}
      <div className="card-video-mask relative h-full w-full">
        <Image
          src={example.poster}
          alt=""
          fill
          sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
          priority={eager}
          unoptimized={isRemoteMedia(example.poster)}
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
        {example.source ? (
          <div
            className={`pointer-events-none absolute left-2 top-2 z-10 w-[32.4%] transition-opacity duration-200 ${
              hovering ? 'opacity-25' : 'opacity-100'
            }`}
          >
            <div className="card-thumb-swing relative aspect-[80/100] w-full overflow-hidden rounded-md border-2 border-white/90 drop-shadow-lg">
              <Image
                src={example.source}
                alt=""
                fill
                sizes="80px"
                unoptimized={isRemoteMedia(example.source)}
                className="object-cover object-top"
              />
            </div>
          </div>
        ) : null}
      </div>

      <div
        className={`pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent px-2.5 pb-2.5 pt-10 transition-opacity duration-200 ${
          hovering ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/85 sm:text-[11px]">
          {refTag}
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
          Try it
        </button>
      </div>
    </div>
  );
}
