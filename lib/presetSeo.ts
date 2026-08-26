import type { HomePreset } from '@/lib/homePresets';

export function getPresetMetaTitle(preset: HomePreset): string {
  return `${preset.title} AI Porn Video Generator`;
}

export function getPresetMetaDescription(preset: HomePreset): string {
  const motion = preset.hasVideo ? '5-second AI porn videos and still images' : 'AI porn images and short clips';
  return `Generate ${preset.title} ${motion} with AI SLUTBOT. Upload a photo, open the ${preset.title} preset, and create uncensored adult content in minutes. 18+ only.`;
}
