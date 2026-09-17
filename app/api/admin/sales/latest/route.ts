import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { adminSessionOk } from '@/lib/auth/adminSession';
import { SlutbotPayment, SlutbotUser } from '@/lib/models';
import { saleNotificationCopy } from '@/lib/notifyAdmins';

type PaymentLean = {
  _id: unknown;
  planId?: string;
  provider?: string;
  usdAmount?: number;
  userId?: unknown;
  paidAt?: Date;
  updatedAt?: Date;
  createdAt?: Date;
};

export async function GET(req: NextRequest) {
  if (!(await adminSessionOk(req))) {
    return NextResponse.json({ message: 'Admin login required.' }, { status: 401 });
  }

  const sinceRaw = Number(req.nextUrl.searchParams.get('since') || 0);
  const sinceDate = sinceRaw > 0 ? new Date(sinceRaw) : new Date(Date.now() - 60_000);

  await connectDB();
  const payments = (await SlutbotPayment.find({
    status: 'paid',
    walletCredited: true,
    $or: [{ paidAt: { $gt: sinceDate } }, { updatedAt: { $gt: sinceDate } }],
  })
    .sort({ updatedAt: -1 })
    .limit(20)
    .select('planId provider usdAmount userId paidAt updatedAt createdAt')
    .lean()) as PaymentLean[];

  if (!payments.length) return NextResponse.json({ sale: null, sales: [] });

  const userIds = [...new Set(payments.filter((row) => row.userId).map((row) => String(row.userId)))];
  const usersById = new Map<string, { email?: string; name?: string }>();
  if (userIds.length) {
    const users = (await SlutbotUser.find({ _id: { $in: userIds } })
      .select('email name')
      .lean()) as Array<{ _id: unknown; email?: string; name?: string }>;
    for (const user of users) usersById.set(String(user._id), user);
  }

  const sales = payments.map((payment) => {
    const user = payment.userId ? usersById.get(String(payment.userId)) : null;
    const username = user?.name?.trim() || user?.email?.split('@')[0] || null;
    const method = payment.provider === 'telegram_stars' ? 'stars' : 'crypto';
    const copy = saleNotificationCopy({
      planId: payment.planId || '',
      method,
      username: username || undefined,
      usd: payment.usdAmount,
    });
    const at = payment.paidAt || payment.updatedAt || payment.createdAt;
    return {
      id: String(payment._id),
      plan: payment.planId || '',
      planLabel: copy.planLabel,
      method,
      username,
      usd: payment.usdAmount || 0,
      at: at ? new Date(at).toISOString() : '',
      body: copy.body,
    };
  });

  return NextResponse.json({
    sale: sales[0] || null,
    sales,
  });
}
