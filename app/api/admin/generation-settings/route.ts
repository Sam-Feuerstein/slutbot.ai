import { NextRequest, NextResponse } from 'next/server';
import { adminPasswordOk } from '@/lib/auth/slutbotAuth';
import {
  DEFAULT_IMAGE_PROMPT,
  DEFAULT_VIDEO_PROMPT,
  getImagePrompt,
  getVideoPrompt,
  setGenerationPrompts,
} from '@/lib/generationSettings';

function denyAdmin(req: NextRequest) {
  if (!adminPasswordOk(req)) {
    return NextResponse.json({ message: 'Admin password required.' }, { status: 401 });
  }
  return null;
}

export async function GET(req: NextRequest) {
  const denied = denyAdmin(req);
  if (denied) return denied;
  const [videoPrompt, imagePrompt] = await Promise.all([getVideoPrompt(), getImagePrompt()]);
  return NextResponse.json({
    videoPrompt,
    imagePrompt,
    defaultVideoPrompt: DEFAULT_VIDEO_PROMPT,
    defaultImagePrompt: DEFAULT_IMAGE_PROMPT,
  });
}

export async function PUT(req: NextRequest) {
  const denied = denyAdmin(req);
  if (denied) return denied;
  const body = (await req.json()) as { videoPrompt?: string; imagePrompt?: string };
  const saved = await setGenerationPrompts({
    videoPrompt: body.videoPrompt,
    imagePrompt: body.imagePrompt,
  });
  return NextResponse.json({
    ...saved,
    defaultVideoPrompt: DEFAULT_VIDEO_PROMPT,
    defaultImagePrompt: DEFAULT_IMAGE_PROMPT,
  });
}
