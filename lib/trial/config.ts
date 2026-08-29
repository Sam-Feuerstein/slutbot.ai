import { DESIRE_COSTS } from '@/lib/generation/costs';

/** Enough for 2 images or 1 standard 480p video. */
export const TRIAL_CREDITS = DESIRE_COSTS.videoBasic;

/**
 * ffmpeg gblur sigma for locked trial videos. Higher = more blur.
 * Tune this later once playback tests are in.
 */
export const TRIAL_VIDEO_BLUR_SIGMA = 32;

export const TRIAL_VIDEO_QUALITY = '480p' as const;
