import { DESIRE_COSTS } from '@/lib/generation/costs';

/** One free image. Trial cannot run video. */
export const TRIAL_CREDITS = DESIRE_COSTS.image;

/**
 * ffmpeg gblur sigma for locked trial videos. Higher = more blur.
 * Tune this later once playback tests are in.
 */
export const TRIAL_VIDEO_BLUR_SIGMA = 32;

export const TRIAL_VIDEO_QUALITY = '480p' as const;
