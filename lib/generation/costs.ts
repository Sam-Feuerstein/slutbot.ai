import type { VideoModel } from '@/lib/imageToVideo/types';

/** Server billing table. Client UI must use the same numbers; never trust a client-supplied amount. */
export const DESIRE_COSTS = {
  image: 16,
  videoBasic: 32,
  videoBetter: 32,
  videoBetter720: 48,
  videoBetter1080: 64,
} as const;

export type VideoQuality = '480p' | '720p' | '1080p';

export function getGenerationDesireCost(
  mode: 'image' | 'video',
  videoModel: VideoModel = 'current',
  quality: VideoQuality = '480p',
): number {
  if (mode === 'image') return DESIRE_COSTS.image;
  if (videoModel === 'cheap') return DESIRE_COSTS.videoBasic;
  if (quality === '1080p') return DESIRE_COSTS.videoBetter1080;
  if (quality === '720p') return DESIRE_COSTS.videoBetter720;
  return DESIRE_COSTS.videoBetter;
}
