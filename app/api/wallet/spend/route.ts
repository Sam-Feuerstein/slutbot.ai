import { NextRequest, NextResponse } from 'next/server';
import { authenticateSlutbotUser } from '@/lib/auth/slutbotAuth';
import { recordUserGeneration, spendUserDesires } from '@/lib/users/wallet';

export async function POST(req: NextRequest) {
  const user = await authenticateSlutbotUser(req);
  if (!user) return NextResponse.json({ message: 'Sign in required.' }, { status: 401 });

  const body = (await req.json()) as { amount?: number; mode?: 'image' | 'video' };
  const amount = Math.round(Number(body.amount));
  if (!amount || amount < 1) {
    return NextResponse.json({ message: 'Invalid amount.' }, { status: 400 });
  }

  const spent = await spendUserDesires(user.id, amount);
  if (!spent.ok) {
    return NextResponse.json({ message: 'Not enough Slutcoins.', desires: spent.desires }, { status: 402 });
  }

  if (body.mode === 'image' || body.mode === 'video') {
    await recordUserGeneration(user.id, body.mode);
  }

  return NextResponse.json({ desires: spent.desires });
}
