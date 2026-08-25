import { NextRequest, NextResponse } from 'next/server';
import { adminSessionOk } from '@/lib/auth/adminSession';
import { getAnalyticsSummary } from '@/lib/analytics';

export async function GET(req: NextRequest) {
  if (!(await adminSessionOk(req))) {
    return NextResponse.json({ message: 'Admin password required.' }, { status: 401 });
  }

  try {
    const data = await getAnalyticsSummary();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ message: 'Could not load analytics.' }, { status: 503 });
  }
}
