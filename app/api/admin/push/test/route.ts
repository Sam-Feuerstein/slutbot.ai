import { NextRequest, NextResponse } from 'next/server';
import { adminSessionOk } from '@/lib/auth/adminSession';
import { notifyAdminsOfSale } from '@/lib/notifyAdmins';

export async function POST(req: NextRequest) {
  if (!(await adminSessionOk(req))) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  await notifyAdminsOfSale({
    planId: 'flirt',
    method: 'crypto',
    username: 'test',
    usd: 9.99,
  });

  return NextResponse.json({ ok: true });
}
