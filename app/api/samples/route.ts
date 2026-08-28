import { NextResponse } from 'next/server';
import { listPublicBeforeAfter, listPublicExamples } from '@/lib/samples';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [examples, beforeAfter] = await Promise.all([
      listPublicExamples(),
      listPublicBeforeAfter(),
    ]);
    return NextResponse.json({ examples, beforeAfter });
  } catch (err) {
    console.error('Public samples list error:', err);
    return NextResponse.json({ message: 'Could not load samples.' }, { status: 503 });
  }
}
