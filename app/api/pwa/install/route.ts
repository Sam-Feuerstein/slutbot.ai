import { NextRequest, NextResponse } from 'next/server';
import { authenticateSlutbotUser } from '@/lib/auth/slutbotAuth';
import { isClientId } from '@/lib/payments/catalog';
import { recordPwaInstall } from '@/lib/pwaInstall';
import { clientIp, rateLimitAllowed } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  if (!rateLimitAllowed({ name: 'pwa-install', key: clientIp(req), windowMs: 60 * 60 * 1000, max: 20 })) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  let body: { clientId?: string };
  try {
    body = (await req.json()) as { clientId?: string };
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const clientId = (body.clientId || '').trim();
  if (!isClientId(clientId)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const user = await authenticateSlutbotUser(req);
  const result = await recordPwaInstall({ clientId, userId: user?.id || null });
  if (!result.ok) return NextResponse.json({ ok: false }, { status: 400 });
  return NextResponse.json({ ok: true });
}
