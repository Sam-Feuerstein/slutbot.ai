import { NextRequest, NextResponse } from 'next/server';
import { adminSessionOk } from '@/lib/auth/adminSession';
import { vapidPublicKey } from '@/lib/notifyAdmins';

export async function GET(req: NextRequest) {
  if (!(await adminSessionOk(req))) {
    return NextResponse.json({ message: 'Admin login required.' }, { status: 401 });
  }

  const publicKey = vapidPublicKey();
  if (!publicKey) return NextResponse.json({ message: 'Not configured' }, { status: 503 });
  return NextResponse.json({ publicKey });
}
