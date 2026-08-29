import type { VideoModel } from '@/lib/imageToVideo/types';
import type { VideoEngine } from '@/lib/generationSettings';
import type { VideoQuality } from '@/lib/generation/costs';

export const VIDEO_DURATION_MIN = 5;
export const VIDEO_DURATION_MAX = 8;
export const VIDEO_DURATION_DEFAULT = 5;
export const VIDEO_DURATION_PRESETS = [5, 8] as const;
export const VIDEO_CUSTOM_PROMPT_MAX = 240;
export const VIDEO_QUALITY_FIXED: VideoQuality = '480p';

export const VIDEO_QUALITY_OPTIONS: {
  id: VideoQuality;
  label: string;
  hint: string;
}[] = [{ id: '480p', label: '480p', hint: 'Standard' }];

export function qualityLabel(quality: VideoQuality): string {
  return VIDEO_QUALITY_OPTIONS.find((row) => row.id === quality)?.hint || quality;
}

/** Always the 8s-capable fast model. The longer spicy model is not used. */
export function resolveVideoEngine(
  _duration?: number,
  _quality?: VideoQuality,
): { videoModel: VideoModel; engine: VideoEngine; usesLtx: boolean } {
  return {
    usesLtx: false,
    videoModel: 'cheap',
    engine: 'wan_ultra_fast',
  };
}

export function clampVideoDuration(value: number): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return VIDEO_DURATION_DEFAULT;
  return n <= 6 ? 5 : 8;
}

const CLOTHING_IN_USER_PROMPT =
  /\b(clothes?|clothing|clothed|dressed|wearing|wear|outfit|shirt|t-?shirt|blouse|pants|trousers|jeans|dress|skirt|bra|underwear|panties|lingerie|jacket|coat|hoodie|sweater|shorts|socks|shoes|covered|fabric)\b/gi;

export const VIDEO_CLOTHING_NEGATIVE =
  'clothes, clothing, dressed, wearing, outfit, shirt, pants, dress, skirt, bra, underwear, jacket, coat, hoodie, fabric, covered body, clothed';

const NUDE_PRIORITY_LOCK =
  'Highest priority, must follow: the person is fully naked, completely nude, no clothes. Remove all clothing. Optional extras never add or keep clothes.';

export function clipCustomVideoPrompt(value: string): string {
  return value.trim().replace(/\s+/g, ' ').slice(0, VIDEO_CUSTOM_PROMPT_MAX);
}

function sanitizeUserVideoExtra(value: string): string {
  return clipCustomVideoPrompt(value)
    .replace(CLOTHING_IN_USER_PROMPT, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function mergeVideoPrompts(basePrompt: string, userPrompt?: string): string {
  const base = basePrompt.trim();
  const extra = sanitizeUserVideoExtra(userPrompt || '');
  if (!base) return extra;
  if (!extra) return `${base} ${NUDE_PRIORITY_LOCK}`.trim();
  const room = Math.max(40, 900 - base.length - NUDE_PRIORITY_LOCK.length - 80);
  const clippedExtra = extra.slice(0, room);
  return [
    base,
    `Low priority extras, motion and camera only: ${clippedExtra}.`,
    NUDE_PRIORITY_LOCK,
  ]
    .join(' ')
    .trim();
}
