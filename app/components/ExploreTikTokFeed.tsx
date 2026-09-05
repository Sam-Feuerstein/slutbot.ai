'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Flame } from 'lucide-react';
import type { HomePreset } from '@/lib/homePresets';
import { AUTH_CHANGED_EVENT } from '@/lib/auth/profile';
import { displayPresetLikeCount } from '@/lib/exploreLikes/seed';
import { fetchExploreLikes, toggleExplorePresetLike } from '@/lib/exploreLikes/client';
import {
  getPresetPosterUrl,
  getPresetPreviewUrl,
  getPresetMainImageUrl,
  presetHasVideo,
} from '@/lib/presetMedia';
import { isRemoteMedia } from '@/lib/media/image';
import { getAuthToken } from '@/lib/desires';
import { EXPLORE_PATH, generatorPresetPath, loginHref } from '@/lib/site';
import SampleLikeButton from './SampleLikeButton';

const GUEST_FEED_LIMIT = 3;

function ExplorePresetSlide({
  preset,
  isActive,
  nearActive,
  eagerPoster,
  liked,
  likeCount,
  onToggleLike,
}: {
  preset: HomePreset;
  isActive: boolean;
  nearActive: boolean;
  eagerPoster: boolean;
  liked: boolean;
  likeCount: number;
  onToggleLike: () => void;
}) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewSrc = getPresetPreviewUrl(preset);
  const posterSrc = getPresetPosterUrl(preset);
  const mainImageSrc = getPresetMainImageUrl(preset) ?? posterSrc;
  const hasVideo = presetHasVideo(preset);
  const mountVideo = Boolean(previewSrc && (isActive || nearActive));

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !mountVideo) return;
    if (isActive) {
      video.play().catch(() => undefined);
      return;
    }
    video.pause();
    video.currentTime = 0;
  }, [isActive, mountVideo, previewSrc]);

  const openPreset = () => {
    const dest = generatorPresetPath(preset.id);
    if (!getAuthToken()) {
      router.push(loginHref(dest));
      return;
    }
    router.push(dest);
  };

  return (
    <article
      data-preset-id={preset.id}
      role="button"
      tabIndex={0}
      onClick={openPreset}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openPreset();
        }
      }}
      className="relative h-full min-h-full w-full shrink-0 cursor-pointer snap-start snap-always"
    >
      <div className="relative mx-auto h-full w-full max-w-[480px] bg-[#0a0a0a]">
        {hasVideo ? (
          <>
            <Image
              src={posterSrc}
              alt=""
              fill
              sizes="(max-width: 480px) 100vw, 480px"
              priority={eagerPoster}
              loading={eagerPoster ? 'eager' : 'lazy'}
              unoptimized={isRemoteMedia(posterSrc)}
              className="object-cover object-top"
            />
            {mountVideo ? (
              <video
                ref={videoRef}
                src={previewSrc}
                poster={posterSrc}
                loop
                muted
                playsInline
                autoPlay={isActive}
                preload={isActive ? 'metadata' : 'none'}
                className={`absolute inset-0 h-full w-full object-cover object-top ${
                  isActive ? 'opacity-100' : 'pointer-events-none opacity-0'
                }`}
              />
            ) : null}
          </>
        ) : (
          <Image
            src={mainImageSrc}
            alt=""
            fill
            sizes="(max-width: 480px) 100vw, 480px"
            priority={eagerPoster}
            loading={eagerPoster ? 'eager' : 'lazy'}
            unoptimized={isRemoteMedia(mainImageSrc)}
            className="object-cover object-top"
          />
        )}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-4 pb-6 pt-16">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold tracking-wide text-white/70">@AISLUTBOT</p>
              <div className="mt-1 flex items-center gap-2">
                <h2 className="truncate text-lg font-bold text-white">{preset.title}</h2>
                {preset.verified ? (
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#ff2d78]">
                    <Flame className="h-3.5 w-3.5 text-white" />
                  </span>
                ) : null}
              </div>
            </div>
            <div className="pointer-events-auto shrink-0 pb-0.5">
              <SampleLikeButton liked={liked} count={likeCount} onToggle={onToggleLike} />
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function ExploreLoginGate() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex h-1/2 flex-col justify-start bg-gradient-to-t from-black via-black/95 to-black/40 px-6 pt-5 pb-[max(1.25rem,var(--safe-bottom))]">
      <div className="pointer-events-auto mx-auto w-full max-w-[480px]">
        <h2 className="text-center text-xl font-black tracking-tight text-white sm:text-2xl">
          Log in to view more
        </h2>
        <Link
          href={loginHref(EXPLORE_PATH)}
          className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#ff2d78] px-6 text-sm font-black uppercase tracking-[0.1em] text-white shadow-lg shadow-[#ff2d78]/35 transition-colors hover:bg-[#ff1a6b]"
        >
          Log in
        </Link>
      </div>
    </div>
  );
}

export default function ExploreTikTokFeed({ presets }: { presets: HomePreset[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [activeId, setActiveId] = useState(presets[0]?.id ?? '');
  const [likedIds, setLikedIds] = useState<Set<string>>(() => new Set());
  const [displayCounts, setDisplayCounts] = useState<Record<string, number>>(() => ({}));

  useEffect(() => {
    const syncAuth = () => setSignedIn(Boolean(getAuthToken()));
    syncAuth();
    window.addEventListener(AUTH_CHANGED_EVENT, syncAuth);
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, syncAuth);
  }, []);

  const visiblePresets = useMemo(
    () => (signedIn ? presets : presets.slice(0, GUEST_FEED_LIMIT)),
    [presets, signedIn],
  );
  const gated = !signedIn && presets.length > GUEST_FEED_LIMIT;
  const activeIndex = Math.max(
    0,
    visiblePresets.findIndex((preset) => preset.id === activeId),
  );
  const showGate = gated && activeIndex >= GUEST_FEED_LIMIT - 1;

  useEffect(() => {
    if (!visiblePresets.length) return;
    if (!visiblePresets.some((preset) => preset.id === activeId)) {
      setActiveId(visiblePresets[0].id);
    }
  }, [visiblePresets, activeId]);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void fetchExploreLikes().then((snapshot) => {
        if (cancelled || !snapshot) return;
        setLikedIds(snapshot.likedIds);
        setDisplayCounts(snapshot.displayCounts);
      });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  const toggleLike = useCallback(
    (presetId: string) => {
      const liked = likedIds.has(presetId);
      void toggleExplorePresetLike(presetId, liked ? 'unlike' : 'like').then((result) => {
        if (!result) return;
        setLikedIds((prev) => {
          const next = new Set(prev);
          if (result.liked) next.add(presetId);
          else next.delete(presetId);
          return next;
        });
        setDisplayCounts((prev) => ({ ...prev, [presetId]: result.displayCount }));
      });
    },
    [likedIds],
  );

  const publishActive = useCallback(() => {
    const root = containerRef.current;
    if (!root) return;
    const slides = Array.from(root.querySelectorAll<HTMLElement>('[data-preset-id]'));
    const mid = root.scrollTop + root.clientHeight / 2;
    let bestId = '';
    let bestDist = Infinity;
    for (const slide of slides) {
      const id = slide.dataset.presetId;
      if (!id) continue;
      const center = slide.offsetTop + slide.clientHeight / 2;
      const dist = Math.abs(center - mid);
      if (dist < bestDist) {
        bestDist = dist;
        bestId = id;
      }
    }
    if (bestId) setActiveId(bestId);
  }, []);

  useEffect(() => {
    const root = containerRef.current;
    if (!root || !visiblePresets.length) return;

    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        publishActive();
      });
    };
    root.addEventListener('scroll', onScroll, { passive: true });
    publishActive();

    return () => {
      root.removeEventListener('scroll', onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [visiblePresets, gated, publishActive]);

  if (!presets.length) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center text-sm text-white/50">
        Nothing in the feed yet.
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-0">
      <div
        ref={containerRef}
        className="h-full overflow-y-auto snap-y snap-mandatory overscroll-y-contain scroll-smooth scrollbar-none"
      >
        {visiblePresets.map((preset, index) => (
          <ExplorePresetSlide
            key={preset.id}
            preset={preset}
            isActive={activeId === preset.id}
            nearActive={Math.abs(index - activeIndex) === 1}
            eagerPoster={index === 0}
            liked={likedIds.has(preset.id)}
            likeCount={displayCounts[preset.id] ?? displayPresetLikeCount(preset.id, 0)}
            onToggleLike={() => toggleLike(preset.id)}
          />
        ))}
      </div>
      {showGate ? <ExploreLoginGate /> : null}
    </div>
  );
}
