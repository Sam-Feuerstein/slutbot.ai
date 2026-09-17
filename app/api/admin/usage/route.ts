import { NextRequest, NextResponse } from 'next/server';
import { adminSessionOk } from '@/lib/auth/adminSession';
import { getCreditUsageReport } from '@/lib/admin/creditUsage';

export async function GET(req: NextRequest) {
  if (!(await adminSessionOk(req))) {
    return NextResponse.json({ message: 'Admin login required.' }, { status: 401 });
  }

  try {
    const report = await getCreditUsageReport();
    return NextResponse.json(report);
  } catch (err) {
    console.error('Admin usage report error:', err);
    return NextResponse.json({ message: 'Could not load usage report.' }, { status: 500 });
  }
}
