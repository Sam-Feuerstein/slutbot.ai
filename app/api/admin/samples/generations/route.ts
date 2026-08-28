import { NextRequest, NextResponse } from 'next/server';
import { adminSessionOk } from '@/lib/auth/adminSession';
import { promoteGenerationToSample } from '@/lib/samples';

export const dynamic = 'force-dynamic';

async function denyAdmin(req: NextRequest) {
  if (!(await adminSessionOk(req))) {
    return NextResponse.json({ message: 'Admin login required.' }, { status: 401 });
  }
  return null;
}

export async function POST(req: NextRequest) {
  const denied = await denyAdmin(req);
  if (denied) return denied;
  const body = (await req.json().catch(() => null)) as { generationId?: string; title?: string } | null;
  const generationId = body?.generationId?.trim() || '';
  if (!generationId) {
    return NextResponse.json({ message: 'generationId is required.' }, { status: 400 });
  }
  try {
    const sample = await promoteGenerationToSample(generationId, body?.title);
    return NextResponse.json({ sample });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not add to samples.';
    return NextResponse.json({ message }, { status: 400 });
  }
}
