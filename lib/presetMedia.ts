import type { HomePreset } from '@/lib/homePresets';

/** R2 folder prefix for preset assets (CDN path only — not the public site domain). */
export const PRESET_MEDIA_PREFIX = 'slutbot.ai';

/** Public R2 host for preset posters/videos. Env wins; fallback keeps production working if the Vercel build missed NEXT_PUBLIC_*. */
const DEFAULT_PRESET_MEDIA_BASE = 'https://pub-17aa5d996caf4f7086190be5ee8807c5.r2.dev';

export const PRESET_MEDIA_BASE = (
  process.env.NEXT_PUBLIC_PRESET_MEDIA_BASE || DEFAULT_PRESET_MEDIA_BASE
).replace(/\/$/, '');

export function presetAssetBase(generation: number): string {
  return `ai-slut-video-generation${generation}`;
}

export function presetMediaKey(generation: number, filename: string): string {
  return `${PRESET_MEDIA_PREFIX}/${filename}`;
}

export function presetMediaUrl(generation: number, filename: string): string {
  if (!PRESET_MEDIA_BASE) return '';
  return `${PRESET_MEDIA_BASE}/${presetMediaKey(generation, filename)}`;
}

export function getPresetPosterUrl(preset: HomePreset): string {
  return presetMediaUrl(preset.generation, `${presetAssetBase(preset.generation)}.jpg`);
}

export function getPresetSourceUrl(preset: HomePreset): string {
  const ext = preset.sourceExt ?? '.webp';
  return presetMediaUrl(preset.generation, `${presetAssetBase(preset.generation)}-source${ext}`);
}

export function getPresetMainImageUrl(preset: HomePreset): string | undefined {
  if (!preset.mainImageExt) return undefined;
  return presetMediaUrl(
    preset.generation,
    `${presetAssetBase(preset.generation)}-main${preset.mainImageExt}`,
  );
}

export function getPresetMp4Url(preset: HomePreset): string | undefined {
  if (!preset.hasVideo) return undefined;
  return presetMediaUrl(preset.generation, `${presetAssetBase(preset.generation)}.mp4`);
}

/** Lightweight clip for card hover / autoplay. */
export function getPresetPreviewUrl(preset: HomePreset): string | undefined {
  if (!preset.hasVideo) return undefined;
  return presetMediaUrl(preset.generation, `${presetAssetBase(preset.generation)}-preview.mp4`);
}

export function presetHasVideo(preset: HomePreset): boolean {
  return Boolean(preset.hasVideo);
}

export function uiMediaUrl(path: string): string {
  if (!PRESET_MEDIA_BASE) return path;
  return `${PRESET_MEDIA_BASE}/${PRESET_MEDIA_PREFIX}/${path}`;
}

/**
 * Map a local `/examples/...` sample asset to its R2 CDN URL.
 *
 * Sample posters/videos/before-after images used to ship in `public/examples`
 * and egress from Vercel on every view. They are now mirrored to the public R2
 * bucket root (e.g. `/examples/example-ex-1.jpg` -> `<base>/example-ex-1.jpg`,
 * `/examples/before-after/pair-01-before.jpg` -> `<base>/before-after/...`).
 * When the CDN base is configured we serve from R2; otherwise (e.g. local dev
 * without the env var) we fall back to the local path so nothing breaks.
 *
 * Non-`/examples/` values (already-absolute R2 URLs from admin uploads, empty
 * strings, etc.) are returned unchanged.
 */
export function exampleMediaUrl(path: string): string {
  if (!path || !path.startsWith('/examples/')) return path;
  if (!PRESET_MEDIA_BASE) return path;
  const rest = path.slice('/examples/'.length);
  return `${PRESET_MEDIA_BASE}/${rest}`;
}

export function checkoutPromoMediaUrl(file: string, localFallback: string): string {
  const remote = uiMediaUrl(`checkout/${file}`);
  return PRESET_MEDIA_BASE ? remote : localFallback;
}
