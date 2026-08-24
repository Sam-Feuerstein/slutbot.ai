import { NextRequest, NextResponse } from 'next/server';
import { authenticateSlutbotUser } from '@/lib/auth/slutbotAuth';
import { adjustUserDesires } from '@/lib/users/wallet';

export async function POST(req: NextRequest) {
  const user = await authenticateSlutbotUser(req);
  if (!user) return NextResponse.json({ message: 'Sign in required.' }, { status: 401 });

  const body = (await req.json()) as { amount?: number };
  const amount = Math.round(Number(body.amount));
  if (!amount || amount < 1) {
    return NextResponse.json({ message: 'Invalid amount.' }, { status: 400 });
  }

  const desires = await adjustUserDesires(user.id, amount);
  return NextResponse.json({ desires: desires ?? user.desires });
}
