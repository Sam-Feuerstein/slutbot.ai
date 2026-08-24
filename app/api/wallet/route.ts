import { NextRequest, NextResponse } from 'next/server';
import { authenticateSlutbotUser } from '@/lib/auth/slutbotAuth';
import { getWalletDesires } from '@/lib/users/wallet';
import { isClientId } from '@/lib/payments/catalog';

export async function GET(req: NextRequest) {
  const user = await authenticateSlutbotUser(req);
  if (user) {
    return NextResponse.json({ desires: user.desires, clientId: user.clientId, source: 'user' });
  }

  const clientId = req.nextUrl.searchParams.get('clientId')?.trim() || '';
  if (!isClientId(clientId)) {
    return NextResponse.json({ desires: 0 });
  }
  try {
    const desires = await getWalletDesires(clientId);
    return NextResponse.json({ desires, clientId, source: 'guest' });
  } catch {
    return NextResponse.json({ desires: 0 });
  }
}
