import type { HomePreset } from '@/lib/homePresets';

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
