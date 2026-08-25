import { NextRequest, NextResponse } from 'next/server';
import { adminSessionOk } from '@/lib/auth/adminSession';
import {
  DEFAULT_IMAGE_PROMPT,
  DEFAULT_VIDEO_PROMPT,
  getImagePrompt,
  getVideoPrompt,
  setGenerationPrompts,
} from '@/lib/generationSettings';

async function denyAdmin(req: NextRequest) {
  if (!(await adminSessionOk(req))) {
    return NextResponse.json({ message: 'Admin login required.' }, { status: 401 });
  }
  return null;
}

export async function GET(req: NextRequest) {
  const denied = await denyAdmin(req);
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
  const denied = await denyAdmin(req);
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
