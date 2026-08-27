import { NextRequest, NextResponse } from 'next/server';
import { adminSessionOk } from '@/lib/auth/adminSession';
import { vapidPublicKey } from '@/lib/notifyAdmins';
import { getPwaInstallSnapshot } from '@/lib/pwaInstall';

export async function GET(req: NextRequest) {
  if (!(await adminSessionOk(req))) {
    return NextResponse.json({ message: 'Admin login required.' }, { status: 401 });
  }

  const limit = Number(req.nextUrl.searchParams.get('limit') || 100);
  const data = await getPwaInstallSnapshot(limit);
  return NextResponse.json({
    ...data,
    push: { vapidConfigured: Boolean(vapidPublicKey()) },
  });
}
