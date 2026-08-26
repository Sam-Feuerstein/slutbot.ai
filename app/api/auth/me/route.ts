import { NextRequest, NextResponse } from 'next/server';
import { authenticateSlutbotUser } from '@/lib/auth/slutbotAuth';
import { isAdminAppUserEmail } from '@/lib/auth/adminUser';

export async function GET(req: NextRequest) {
  const user = await authenticateSlutbotUser(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
  return NextResponse.json({
    ...user,
    isAdmin: isAdminAppUserEmail(user.email),
  });
}
