import { NextRequest, NextResponse } from 'next/server';
import { authenticateSlutbotUser } from '@/lib/auth/slutbotAuth';
import { ADMIN_INFINITE_DESIRES, isAdminAppUserEmail } from '@/lib/auth/adminUser';

export async function GET(req: NextRequest) {
  const user = await authenticateSlutbotUser(req);
  if (!user) return NextResponse.json({ message: 'Sign in required.' }, { status: 401 });

  const desires = isAdminAppUserEmail(user.email) ? ADMIN_INFINITE_DESIRES : user.desires;
  return NextResponse.json({
    desires,
    clientId: user.clientId,
    source: 'user',
    ...(isAdminAppUserEmail(user.email) ? { infinite: true, isAdmin: true } : {}),
  });
}
