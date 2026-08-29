import type { VideoModel } from '@/lib/imageToVideo/types';

/** Server billing table. Client UI must use the same numbers; never trust a client-supplied amount. */
export const DESIRE_COSTS = {
  image: 8,
  videoBasic: 16,
  videoBetter: 16,
  videoBetter720: 24,
  videoBetter1080: 32,
} as const;

export type VideoQuality = '480p' | '720p' | '1080p';

/** Default clip billed as 5 seconds. Longer videos scale from this baseline. */
export const VIDEO_BASELINE_SECONDS = 5;

function videoBaseCost(videoModel: VideoModel, quality: VideoQuality): number {
  if (videoModel === 'cheap') return DESIRE_COSTS.videoBasic;
  if (quality === '1080p') return DESIRE_COSTS.videoBetter1080;
  if (quality === '720p') return DESIRE_COSTS.videoBetter720;
  return DESIRE_COSTS.videoBetter;
}

function billedVideoSeconds(duration?: number): number {
  const n = Math.round(Number(duration));
  if (!Number.isFinite(n)) return VIDEO_BASELINE_SECONDS;
  return Math.min(8, Math.max(VIDEO_BASELINE_SECONDS, n));
}

export function getGenerationDesireCost(
  mode: 'image' | 'video',
  videoModel: VideoModel = 'current',
  quality: VideoQuality = '480p',
  duration = VIDEO_BASELINE_SECONDS,
): number {
  if (mode === 'image') return DESIRE_COSTS.image;
  const base = videoBaseCost(videoModel, quality);
  const seconds = billedVideoSeconds(duration);
  return Math.max(1, Math.round((base * seconds) / VIDEO_BASELINE_SECONDS));
}
