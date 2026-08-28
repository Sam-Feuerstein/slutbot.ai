import { NextRequest, NextResponse } from 'next/server';
import { countryFromHeaders } from '@/lib/starsGeo/detect';
import { getLikedSampleIds, recordSampleEngage, type SampleEngageAction } from '@/lib/samples';

export const dynamic = 'force-dynamic';

const buckets = new Map<string, { count: number; start: number }>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 60;

function allow(ip: string): boolean {
  const now = Date.now();
  const current = buckets.get(ip);
  if (!current || now - current.start > WINDOW_MS) {
    buckets.set(ip, { count: 1, start: now });
    return true;
  }
  if (current.count >= MAX_PER_WINDOW) return false;
  current.count += 1;
  return true;
}

function clientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'local';
}

export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get('clientId')?.trim() || '';
  if (!clientId) return NextResponse.json({ likedIds: [] as string[] });
  try {
    const likedIds = await getLikedSampleIds(clientId);
    return NextResponse.json({ likedIds });
  } catch {
    return NextResponse.json({ likedIds: [] as string[] });
  }
}

export async function POST(req: NextRequest) {
  if (!allow(clientIp(req))) {
    return NextResponse.json({ message: 'Too many requests.' }, { status: 429 });
  }

  let body: { sampleId?: string; action?: SampleEngageAction; clientId?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ message: 'Invalid JSON.' }, { status: 400 });
  }

  const sampleId = body.sampleId?.trim() || '';
  const action = body.action;
  const clientId = body.clientId?.trim() || '';
  if (!sampleId || (action !== 'click' && action !== 'like' && action !== 'unlike')) {
    return NextResponse.json({ message: 'sampleId and action are required.' }, { status: 400 });
  }

  try {
    const result = await recordSampleEngage({
      sampleId,
      action,
      clientId,
      country: countryFromHeaders(req.headers),
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not record engagement.';
    return NextResponse.json({ message }, { status: 400 });
  }
}
