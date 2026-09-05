import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { SlutbotUser } from '@/lib/models';
import { authenticateSlutbotUser } from '@/lib/auth/slutbotAuth';
import { isAdminAppUserEmail } from '@/lib/auth/adminUser';
import { publicBalanceFields } from '@/lib/users/wallet';
import { accountTierForUser } from '@/lib/entitlements';

export async function GET(req: NextRequest) {
  const user = await authenticateSlutbotUser(req);
  if (!user) return NextResponse.json({ message: 'Sign in required.' }, { status: 401 });

  await connectDB();
  const doc = (await SlutbotUser.findById(user.id).select('desires trialCredits email').lean()) as {
    desires?: number;
    trialCredits?: number;
    email?: string;
  } | null;
  const balance = publicBalanceFields(doc || user);
  const tier = await accountTierForUser({
    userId: user.id,
    email: doc?.email || user.email,
    desires: doc?.desires ?? user.desires,
  });

  return NextResponse.json({
    ...balance,
    tier,
    clientId: user.clientId,
    source: 'user',
    ...(isAdminAppUserEmail(user.email) ? { isAdmin: true } : {}),
  });
}
