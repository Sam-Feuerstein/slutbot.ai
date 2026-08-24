import connectDB from '@/lib/db/mongodb';
import { PlatformSettings } from '@/lib/models';

export const DEFAULT_VIDEO_PROMPT =
  'Turn the subject fully naked, nude. Remove all clothing. This is a nude generator. Keep the same person, face, and pose with natural subtle motion.';

export const DEFAULT_IMAGE_PROMPT =
  'Completely naked. Naked body, nude, perfect skin, perfect natural body. Body maintain its same shape. Hyper realistic. 4K.';

type PromptDoc = { videoPrompt?: string; imagePrompt?: string };

async function getSettingsDoc(): Promise<PromptDoc | null> {
  await connectDB();
  return (await PlatformSettings.findOne({ key: 'platform' }).lean()) as PromptDoc | null;
}

export async function getVideoPrompt(): Promise<string> {
  const doc = await getSettingsDoc();
  return doc?.videoPrompt?.trim() || DEFAULT_VIDEO_PROMPT;
}

export async function getImagePrompt(): Promise<string> {
  const doc = await getSettingsDoc();
  return doc?.imagePrompt?.trim() || DEFAULT_IMAGE_PROMPT;
}

export async function setGenerationPrompts(input: {
  videoPrompt?: string;
  imagePrompt?: string;
}): Promise<{ videoPrompt: string; imagePrompt: string }> {
  await connectDB();
  const current = await getSettingsDoc();
  const videoPrompt = (input.videoPrompt ?? current?.videoPrompt ?? '').trim() || DEFAULT_VIDEO_PROMPT;
  const imagePrompt = (input.imagePrompt ?? current?.imagePrompt ?? '').trim() || DEFAULT_IMAGE_PROMPT;
  await PlatformSettings.findOneAndUpdate(
    { key: 'platform' },
    { $set: { videoPrompt, imagePrompt } },
    { upsert: true, new: true },
  );
  return { videoPrompt, imagePrompt };
}
