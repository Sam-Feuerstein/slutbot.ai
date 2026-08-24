import { SPICYBOX_PRESETS } from './spicyboxPresets';

export type HomePreset = {
  id: string;
  title: string;
  /** Maps to R2 assets: ai-slut-video-generation{N}.* under slutbot.ai/ */
  generation: number;
  remixes: string;
  verified?: boolean;
  cost: number;
  hasVideo?: boolean;
  /** File extension for uploaded source thumb, e.g. .webp or .jpg */
  sourceExt?: string;
  /** Optional separate main image extension for image-only cards */
  mainImageExt?: string;
};

export const CLOTHOFF_PRESETS: HomePreset[] = [
  { id: 'blowjob-2', title: 'Blowjob 2.0', generation: 1, remixes: '1.1M', cost: 18, hasVideo: true, sourceExt: '.webp' },
  { id: 'cumshot-2', title: 'Cumshot 2.0', generation: 2, remixes: '583.5K', cost: 18, hasVideo: true, sourceExt: '.webp' },
  { id: 'missionary-2', title: 'Missionary 2.0', generation: 3, remixes: '582.1K', cost: 18, hasVideo: true, sourceExt: '.webp' },
  { id: 'shows-tits-2', title: 'Shows Tits 2.0', generation: 4, remixes: '420.4K', cost: 18, hasVideo: true, sourceExt: '.webp' },
  { id: 'cumshot-pov', title: 'Cumshot POV', generation: 5, remixes: '415.7K', cost: 18, hasVideo: true, sourceExt: '.webp' },
  { id: 'hard-doggy', title: 'Hard Doggy', generation: 6, remixes: '291.8K', cost: 18, hasVideo: true, sourceExt: '.webp' },
  { id: 'front-doggy', title: 'Front Doggy', generation: 7, remixes: '274.1K', cost: 18, hasVideo: true, sourceExt: '.webp' },
  { id: 'doggy-style-2', title: 'Doggy style 2.0', generation: 8, remixes: '268.6K', cost: 18, hasVideo: true, sourceExt: '.webp' },
  { id: 'handjob', title: 'Handjob', generation: 9, remixes: '206.4K', cost: 18, hasVideo: true, sourceExt: '.webp' },
  {
    id: 'reverse-cowgirl-2',
    title: 'Reverse Cowgirl 2.0',
    generation: 10,
    remixes: '189.7K',
    verified: true,
    cost: 18,
    hasVideo: true,
    sourceExt: '.webp',
  },
  {
    id: 'standing-doggy',
    title: 'Standing Doggy Style',
    generation: 11,
    remixes: '214.9K',
    cost: 18,
    hasVideo: true,
    sourceExt: '.webp',
  },
  {
    id: 'blowjob-pov',
    title: 'Blowjob POV',
    generation: 12,
    remixes: '206.9K',
    verified: true,
    cost: 24,
    sourceExt: '.webp',
  },
];

export const HOME_PRESETS: HomePreset[] = [...CLOTHOFF_PRESETS, ...SPICYBOX_PRESETS];

export function getHomePresetById(id: string): HomePreset | undefined {
  return HOME_PRESETS.find((preset) => preset.id === id);
}

export function getHomePresetIds(): string[] {
  return HOME_PRESETS.map((preset) => preset.id);
}
