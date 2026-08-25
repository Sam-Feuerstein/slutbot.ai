'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Flame, ImagePlus, RefreshCw, X } from 'lucide-react';
import type { HomePreset } from '@/lib/homePresets';
import {
  getPresetMainImageUrl,
  getPresetPosterUrl,
  getPresetPreviewUrl,
  getPresetSourceUrl,
  presetHasVideo,
} from '@/lib/presetMedia';
import { getAuthToken } from '@/lib/desires';
import { generatorPresetPath, loginHref } from '@/lib/site';

const UPLOAD_KEY = 'slutbot-home-upload';

function ArrowCurve({ mirrored = false }: { mirrored?: boolean }) {
  return (
    <svg
      width="36"
      height="36"
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`h-9 w-9 shrink-0 text-white/90 ${mirrored ? 'ml-auto' : 'mx-[25%]'}`}
      aria-hidden
    >
      {mirrored ? (
        <>
          <path
            d="M33.9702 1.53078C34.4587 11.5933 29.1335 31.7885 3.92419 32.0693"
            stroke="currentColor"
            strokeWidth="2.57"
            strokeLinecap="round"
          />
          <path
            d="M1.31176 32.4583C0.922222 32.1966 0.957302 31.6123 1.37526 31.4006L5.65543 29.2332C6.07806 29.0194 6.57399 29.3454 6.54577 29.8186L6.25471 34.6664C6.22629 35.1398 5.69494 35.4022 5.30093 35.1376L1.31176 32.4583Z"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="1.23"
          />
        </>
      ) : (
        <>
          <path
            d="M2.02982 1.53078C1.54127 11.5933 6.86649 31.7885 32.0758 32.0693"
            stroke="currentColor"
            strokeWidth="2.57"
            strokeLinecap="round"
          />
          <path
            d="M34.6882 32.4583C35.0778 32.1966 35.0427 31.6123 34.6247 31.4006L30.3446 29.2332C29.9219 29.0194 29.426 29.3454 29.4542 29.8186L29.7453 34.6664C29.7737 35.1398 30.3051 35.4022 30.6991 35.1376L34.6882 32.4583Z"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="1.23"
          />
        </>
      )}
    </svg>
  );
}

export default function HomePresetCard({
  preset,
  playing = false,
  eager = false,
}: {
  preset: HomePreset;
  playing?: boolean;
  eager?: boolean;
}) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem(UPLOAD_KEY);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw) as { presetId?: string; dataUrl?: string };
      if (saved.presetId === preset.id && saved.dataUrl) {
        setUploadPreview(saved.dataUrl);
      }
    } catch {
      sessionStorage.removeItem(UPLOAD_KEY);
    }
  }, [preset.id]);

  const goToTool = useCallback(() => {
    router.push(generatorPresetPath(preset.id));
  }, [preset.id, router]);

  const onUpload = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result ?? '');
        setUploadPreview(dataUrl);
        sessionStorage.setItem(
          UPLOAD_KEY,
          JSON.stringify({ presetId: preset.id, dataUrl, name: file.name }),
        );
      };
      reader.readAsDataURL(file);
    },
    [preset.id],
  );

  const clearUpload = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setUploadPreview(null);
    sessionStorage.removeItem(UPLOAD_KEY);
  }, []);

  const onMouseEnter = () => {
    setHovering(true);
  };

  const onMouseLeave = () => {
    setHovering(false);
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    video.currentTime = 0;
  };

  const previewSrc = getPresetPreviewUrl(preset);
  const posterSrc = getPresetPosterUrl(preset);
  const sourceSrc = getPresetSourceUrl(preset);
  const mainImageSrc = getPresetMainImageUrl(preset) ?? posterSrc;
  const active = playing || hovering;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !active || !previewSrc) return;
    video.play().catch(() => undefined);
  }, [active, previewSrc]);

  const mainVisual = presetHasVideo(preset) ? (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={posterSrc}
        alt=""
        width={320}
        height={420}
        loading={eager ? 'eager' : 'lazy'}
        fetchPriority={eager ? 'high' : 'auto'}
        decoding="async"
        className="pointer-events-none relative h-full w-full select-none object-cover transition-[filter] duration-500"
      />
      {active && previewSrc ? (
        <video
          ref={videoRef}
          src={previewSrc}
          poster={posterSrc}
          loop
          muted
          playsInline
          autoPlay
          preload="metadata"
          className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover"
        />
      ) : null}
    </>
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={mainImageSrc}
      alt=""
      className="pointer-events-none relative h-full w-full select-none object-cover transition-[filter] duration-500"
    />
  );

  return (
    <div
      data-preset-id={preset.id}
      tabIndex={0}
      role="button"
      onClick={goToTool}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          goToTool();
        }
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onFocus={onMouseEnter}
      onBlur={onMouseLeave}
      className="group/item relative flex aspect-[160/210] w-full cursor-pointer select-none flex-col items-center justify-center overflow-hidden rounded-2xl bg-[#161616] text-white outline-none transition-shadow duration-300 focus-visible:ring-2 focus-visible:ring-[#ff2d78] focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]"
    >
      <div className="card-video-mask relative h-full w-full">{mainVisual}</div>

      <div
        className={`pointer-events-none absolute left-2 top-2 w-[27%] transition-opacity duration-200 ${
          hovering ? 'opacity-20' : 'opacity-100'
        }`}
      >
        <div className="flex w-full flex-col gap-[16cqi]">
          <div className="card-thumb-swing aspect-[80/100] w-full overflow-hidden rounded-md border-2 border-white/90 drop-shadow-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={sourceSrc} alt="" className="h-full w-full object-cover" />
          </div>
          <ArrowCurve />
        </div>
      </div>

      <div
        className={`absolute right-2 top-2 flex flex-col gap-3 transition-opacity duration-200 ${
          hovering ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <div className="relative size-[60px] drop-shadow-lg">
          <button
            type="button"
            aria-label={uploadPreview ? 'Change photo' : 'Upload a photo'}
            onClick={(e) => {
              e.stopPropagation();
              if (!getAuthToken()) {
                router.push(loginHref(generatorPresetPath(preset.id)));
                return;
              }
              inputRef.current?.click();
            }}
            className="group/upload relative flex aspect-square h-full w-full items-center justify-center overflow-hidden rounded-full border-2 border-solid border-white duration-200"
          >
            {uploadPreview ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={uploadPreview} alt="" className="h-full w-full object-cover object-top" />
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 transition-opacity duration-200 group-hover/upload:opacity-100">
                  <RefreshCw className="h-5 w-5 text-white" />
                </span>
              </>
            ) : (
              <span className="flex h-full w-full items-center justify-center bg-[#ff2d78] text-white">
                <ImagePlus className="h-6 w-6" />
              </span>
            )}
          </button>
          {uploadPreview ? (
            <button
              type="button"
              aria-label="Remove photo"
              onClick={clearUpload}
              className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-[#1d1d1d] text-white"
            >
              <X className="h-3 w-3" />
            </button>
          ) : null}
        </div>
        {uploadPreview ? <ArrowCurve mirrored /> : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
          e.target.value = '';
        }}
      />

      <div
        className={`absolute inset-x-2 bottom-2 flex flex-col gap-1 transition-opacity duration-200 ${
          hovering ? 'pointer-events-none opacity-0' : 'opacity-100'
        }`}
      >
        <div className="inline-flex max-w-full items-center gap-2">
          <h3 className="truncate text-base font-bold text-white">{preset.title}</h3>
          {preset.verified ? (
            <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#ff2d78]">
              <Flame className="h-3 w-3 text-white" />
            </span>
          ) : null}
        </div>
        <p className="truncate text-sm text-white/50">
          {preset.remixes.includes('used')
            ? preset.remixes
            : `${preset.remixes} Remixes`}{' '}
          <span className="mx-1">|</span> @SLUTBOT.AI
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
          className="pointer-events-auto flex w-full items-center justify-center gap-2 rounded-full bg-[#ff2d78] px-3 py-3 text-sm font-bold leading-none text-white shadow-lg shadow-[#ff2d78]/40 transition-colors hover:bg-[#ff1a6b]"
        >
          <span>Start Generate</span>
        </button>
      </div>
    </div>
  );
}
