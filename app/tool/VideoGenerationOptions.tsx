'use client';

import { ChevronDown, Lock } from 'lucide-react';
import Link from 'next/link';
import { CURRENCY_NAME, getGenerationDesireCost } from '@/lib/desires';
import {
  clampVideoDuration,
  resolveVideoEngine,
  VIDEO_CUSTOM_PROMPT_MAX,
  VIDEO_DURATION_DEFAULT,
  VIDEO_DURATION_PRESETS,
  VIDEO_QUALITY_FIXED,
} from '@/lib/generation/videoOptions';
import { checkoutHref } from '@/lib/site';
import type { VideoQuality } from '@/lib/desires';

type Props = {
  open: boolean;
  duration: number;
  customPrompt: string;
  extraDetailsLocked?: boolean;
  longClipLocked?: boolean;
  onOpenChange: (open: boolean) => void;
  onDurationChange: (duration: number) => void;
  onCustomPromptChange: (value: string) => void;
};

export function videoGenerationCost(quality: VideoQuality, duration: number) {
  const { videoModel } = resolveVideoEngine(duration, quality);
  return getGenerationDesireCost('video', videoModel, quality, duration);
}

export default function VideoGenerationOptions({
  open,
  duration,
  customPrompt,
  extraDetailsLocked = false,
  longClipLocked = false,
  onOpenChange,
  onDurationChange,
  onCustomPromptChange,
}: Props) {
  const videoCost = videoGenerationCost(VIDEO_QUALITY_FIXED, duration);
  const promptLen = customPrompt.trim().length;
  const customized = duration !== VIDEO_DURATION_DEFAULT || promptLen > 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#1a1a1a]">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <div>
          <p className="text-sm font-bold text-white">Advanced</p>
          <p className="mt-0.5 text-[11px] text-white/40">
            {open || customized
              ? `${duration}s${promptLen ? ' · extra details' : ''}`
              : '8 second clip or extra details'}
          </p>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-white/45 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open ? (
        <div className="space-y-5 border-t border-white/8 px-4 pb-4 pt-4">
          <div>
            <p className="text-sm font-bold text-white">Length</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {VIDEO_DURATION_PRESETS.map((preset) => {
                const active = duration === preset;
                const locked = longClipLocked && preset > VIDEO_DURATION_DEFAULT;
                const cost = videoGenerationCost(VIDEO_QUALITY_FIXED, preset);
                return (
                  <button
                    key={preset}
                    type="button"
                    disabled={locked}
                    onClick={() => {
                      if (locked) return;
                      onDurationChange(clampVideoDuration(preset));
                    }}
                    className={`flex flex-col items-center rounded-xl border px-3 py-3 text-center transition ${
                      locked
                        ? 'cursor-not-allowed border-white/8 bg-black/20 text-white/30'
                        : active
                          ? 'border-[#ff2d78] bg-[#ff2d78]/12 text-white'
                          : 'border-white/10 bg-black/20 text-white/55 hover:border-white/20 hover:text-white'
                    }`}
                  >
                    <span className="text-sm font-extrabold">{preset} seconds</span>
                    <span className="mt-1 text-[11px] font-bold text-[#ff6b9d]">
                      {locked ? 'Paid only' : `${cost} ${CURRENCY_NAME}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-bold text-white">Extra details</p>
              {extraDetailsLocked ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-white/40">
                  <Lock className="h-3 w-3" />
                  ULTRA
                </span>
              ) : (
                <span className="text-[11px] tabular-nums text-white/35">
                  {promptLen}/{VIDEO_CUSTOM_PROMPT_MAX}
                </span>
              )}
            </div>
            <div className="relative mt-2">
              <textarea
                value={extraDetailsLocked ? '' : customPrompt}
                onChange={(e) => onCustomPromptChange(e.target.value.slice(0, VIDEO_CUSTOM_PROMPT_MAX))}
                rows={3}
                disabled={extraDetailsLocked}
                placeholder="Optional extras only — camera, mood, or motion. Example: slow zoom in, soft smile"
                className="w-full resize-none rounded-xl border border-white/10 bg-black/30 px-3.5 py-3 text-sm leading-relaxed text-white placeholder:text-white/30 focus:border-[#ff2d78]/50 focus:outline-none focus:ring-1 focus:ring-[#ff2d78]/30 disabled:text-transparent disabled:placeholder:text-transparent"
              />
              {extraDetailsLocked ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-black/65 px-4 text-center">
                  <Lock className="h-4 w-4 text-white/70" />
                  <p className="mt-1.5 text-[12px] font-bold text-white">ULTRA only</p>
                  <p className="mt-0.5 text-[11px] text-white/50">Custom prompts + turn boring images into spicy porn</p>
                  <Link
                    href={checkoutHref({ plan: 'legend' })}
                    className="mt-2 text-[11px] font-bold uppercase tracking-wide text-[#ff2d78] underline underline-offset-2"
                  >
                    Unlock ULTRA
                  </Link>
                </div>
              ) : null}
            </div>
          </div>

          <p className="text-[11px] leading-relaxed text-white/40">
            Standard is 5 seconds. An 8 second clip uses more {CURRENCY_NAME}.
            <span className="ml-1 font-semibold text-white/60">
              {duration}s · {videoCost} {CURRENCY_NAME}
            </span>
          </p>
        </div>
      ) : null}
    </div>
  );
}
