import { NextRequest, NextResponse } from 'next/server';
import { adminSessionOk } from '@/lib/auth/adminSession';
import {
  DEFAULT_IMAGE_PROMPT,
  DEFAULT_VIDEO_ENGINE,
  DEFAULT_VIDEO_PROMPT,
  VIDEO_ENGINE_OPTIONS,
  getGenerationSettings,
  setGenerationSettings,
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
  const settings = await getGenerationSettings();
  return NextResponse.json({
    ...settings,
    defaultVideoPrompt: DEFAULT_VIDEO_PROMPT,
    defaultImagePrompt: DEFAULT_IMAGE_PROMPT,
    defaultVideoEngine: DEFAULT_VIDEO_ENGINE,
    videoEngines: VIDEO_ENGINE_OPTIONS,
  });
}

export async function PUT(req: NextRequest) {
  const denied = await denyAdmin(req);
  if (denied) return denied;
  const body = (await req.json()) as {
    videoPrompt?: string;
    imagePrompt?: string;
    videoEngine?: string;
  };
  const saved = await setGenerationSettings({
    videoPrompt: body.videoPrompt,
    imagePrompt: body.imagePrompt,
    videoEngine: body.videoEngine,
  });
  return NextResponse.json({
    ...saved,
    defaultVideoPrompt: DEFAULT_VIDEO_PROMPT,
    defaultImagePrompt: DEFAULT_IMAGE_PROMPT,
    defaultVideoEngine: DEFAULT_VIDEO_ENGINE,
    videoEngines: VIDEO_ENGINE_OPTIONS,
  });
}
