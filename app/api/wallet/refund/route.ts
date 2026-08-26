import { NextRequest, NextResponse } from 'next/server';
import { authenticateSlutbotUser } from '@/lib/auth/slutbotAuth';
import { refundIfWavespeedFailed } from '@/lib/generation/refundFailed';

export async function POST(req: NextRequest) {
  const user = await authenticateSlutbotUser(req);
  if (!user) return NextResponse.json({ message: 'Sign in required.' }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { amount?: number; taskId?: string } | null;
  if (body && 'amount' in body && body.amount != null) {
    return NextResponse.json({ message: 'Arbitrary refunds are not allowed.' }, { status: 400 });
  }
  const taskId = body?.taskId?.trim();
  if (!taskId) {
    return NextResponse.json({ message: 'A failed job id is required.' }, { status: 400 });
  }

  const result = await refundIfWavespeedFailed(user.id, taskId);
  if (!result.ok) {
    return NextResponse.json({ message: result.error || 'Refund not allowed.' }, { status: 400 });
  }
  return NextResponse.json({ desires: result.desires });
}
