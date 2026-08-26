import connectDB from '@/lib/db/mongodb';
import { PlatformSettings } from '@/lib/models';

export const DEFAULT_VIDEO_PROMPT =
  'Turn the subject fully naked, nude. Remove all clothing. This is a nude generator. Keep the same person, face, and pose with natural subtle motion.';

export const DEFAULT_IMAGE_PROMPT =
  'Completely naked. Naked body, nude, perfect skin, perfect natural body. Body maintain its same shape. Hyper realistic. 4K.';

/** Public WaveSpeed video engines the admin can switch between. */
export type VideoEngine = 'wan_ultra_fast' | 'ltx_spicy';

export const DEFAULT_VIDEO_ENGINE: VideoEngine = 'wan_ultra_fast';

export const VIDEO_ENGINE_OPTIONS: {
  id: VideoEngine;
  label: string;
  hint: string;
  docsUrl: string;
  apiPath: string;
}[] = [
  {
    id: 'wan_ultra_fast',
    label: 'WAN 2.2 · 480p Ultra Fast',
    hint: 'Fastest / cheapest video path. Fixed 480p.',
    docsUrl: 'https://wavespeed.ai/models/wavespeed-ai/wan-2.2/i2v-480p-ultra-fast',
    apiPath: 'wavespeed-ai/wan-2.2/i2v-480p-ultra-fast',
  },
  {
    id: 'ltx_spicy',
    label: 'LTX 2.3 Spicy',
    hint: 'Higher quality. Supports 480 / 720 / 1080.',
    docsUrl: 'https://wavespeed.ai/models/wavespeed-ai/ltx-2.3-spicy/image-to-video',
    apiPath: 'wavespeed-ai/ltx-2.3-spicy/image-to-video',
  },
];

type SettingsDoc = {
  videoPrompt?: string;
  imagePrompt?: string;
  videoEngine?: string;
};

function normalizeVideoEngine(value?: string | null): VideoEngine {
  return value === 'ltx_spicy' ? 'ltx_spicy' : DEFAULT_VIDEO_ENGINE;
}

async function getSettingsDoc(): Promise<SettingsDoc | null> {
  await connectDB();
  return (await PlatformSettings.findOne({ key: 'platform' }).lean()) as SettingsDoc | null;
}

export async function getVideoPrompt(): Promise<string> {
  const doc = await getSettingsDoc();
  return doc?.videoPrompt?.trim() || DEFAULT_VIDEO_PROMPT;
}

export async function getImagePrompt(): Promise<string> {
  const doc = await getSettingsDoc();
  return doc?.imagePrompt?.trim() || DEFAULT_IMAGE_PROMPT;
}

export async function getVideoEngine(): Promise<VideoEngine> {
  const doc = await getSettingsDoc();
  return normalizeVideoEngine(doc?.videoEngine);
}

export async function getGenerationSettings(): Promise<{
  videoPrompt: string;
  imagePrompt: string;
  videoEngine: VideoEngine;
}> {
  const doc = await getSettingsDoc();
  return {
    videoPrompt: doc?.videoPrompt?.trim() || DEFAULT_VIDEO_PROMPT,
    imagePrompt: doc?.imagePrompt?.trim() || DEFAULT_IMAGE_PROMPT,
    videoEngine: normalizeVideoEngine(doc?.videoEngine),
  };
}

export async function setGenerationSettings(input: {
  videoPrompt?: string;
  imagePrompt?: string;
  videoEngine?: string;
}): Promise<{ videoPrompt: string; imagePrompt: string; videoEngine: VideoEngine }> {
  await connectDB();
  const current = await getSettingsDoc();
  const videoPrompt = (input.videoPrompt ?? current?.videoPrompt ?? '').trim() || DEFAULT_VIDEO_PROMPT;
  const imagePrompt = (input.imagePrompt ?? current?.imagePrompt ?? '').trim() || DEFAULT_IMAGE_PROMPT;
  const videoEngine =
    input.videoEngine != null
      ? normalizeVideoEngine(input.videoEngine)
      : normalizeVideoEngine(current?.videoEngine);

  await PlatformSettings.findOneAndUpdate(
    { key: 'platform' },
    { $set: { videoPrompt, imagePrompt, videoEngine } },
    { upsert: true, new: true },
  );

  return { videoPrompt, imagePrompt, videoEngine };
}

/** @deprecated Prefer setGenerationSettings */
export async function setGenerationPrompts(input: {
  videoPrompt?: string;
  imagePrompt?: string;
}): Promise<{ videoPrompt: string; imagePrompt: string }> {
  const saved = await setGenerationSettings(input);
  return { videoPrompt: saved.videoPrompt, imagePrompt: saved.imagePrompt };
}
