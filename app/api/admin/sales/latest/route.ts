import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { adminSessionOk } from '@/lib/auth/adminSession';
import { SlutbotPayment, SlutbotUser } from '@/lib/models';
import { saleNotificationCopy } from '@/lib/notifyAdmins';

export async function GET(req: NextRequest) {
  if (!(await adminSessionOk(req))) {
    return NextResponse.json({ message: 'Admin login required.' }, { status: 401 });
  }

  const sinceRaw = Number(req.nextUrl.searchParams.get('since') || 0);
  const sinceDate = sinceRaw > 0 ? new Date(sinceRaw) : new Date(Date.now() - 60_000);

  await connectDB();
  const payment = (await SlutbotPayment.findOne({
    status: 'paid',
    walletCredited: true,
    createdAt: { $gt: sinceDate },
  })
    .sort({ createdAt: -1 })
    .lean()) as {
    planId?: string;
    provider?: string;
    usdAmount?: number;
    userId?: unknown;
    clientId?: string;
    createdAt?: Date;
  } | null;

  if (!payment) return NextResponse.json({ sale: null });

  let username: string | null = null;
  if (payment.userId) {
    const user = (await SlutbotUser.findById(payment.userId).select('email name').lean()) as {
      email?: string;
      name?: string;
    } | null;
    username = user?.name?.trim() || user?.email?.split('@')[0] || null;
  }

  const method = payment.provider === 'telegram_stars' ? 'stars' : 'crypto';
  const copy = saleNotificationCopy({
    planId: payment.planId || '',
    method,
    username: username || undefined,
    usd: payment.usdAmount,
  });

  return NextResponse.json({
    sale: {
      plan: payment.planId || '',
      planLabel: copy.planLabel,
      method,
      username,
      usd: payment.usdAmount || 0,
      at: payment.createdAt ? new Date(payment.createdAt).toISOString() : '',
    },
  });
}
