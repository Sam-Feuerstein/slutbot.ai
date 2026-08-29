import { NextRequest, NextResponse } from 'next/server';
import { isTrackName, type TrackKind } from '@/lib/trackTypes';
import { recordTrackEvent } from '@/lib/analytics';

const buckets = new Map<string, { count: number; start: number }>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 80;

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

export async function POST(req: NextRequest) {
  if (!allow(clientIp(req))) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  let body: {
    name?: string;
    kind?: TrackKind;
    path?: string;
    label?: string;
    plan?: string;
    method?: string;
    clientId?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const name = body.name?.trim() || '';
  if (!isTrackName(name)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    await recordTrackEvent({
      name,
      kind: body.kind,
      path: body.path,
      label: body.label,
      plan: body.plan,
      method: body.method,
      clientId: body.clientId,
      ip: clientIp(req),
      headers: req.headers,
    });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  return NextResponse.json({ ok: true });
}
