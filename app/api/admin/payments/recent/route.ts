import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { adminSessionOk } from '@/lib/auth/adminSession';
import { SlutbotPayment, SlutbotUser } from '@/lib/models';
import { countryName } from '@/lib/starsGeo/countries';

type PaymentLean = {
  _id: unknown;
  planId?: string;
  provider?: string;
  usdAmount?: number;
  starsAmount?: number;
  country?: string;
  userId?: unknown;
  clientId?: string;
  updatedAt?: Date;
  createdAt?: Date;
};

type UserLean = {
  _id: unknown;
  email?: string;
  name?: string;
  signupCountry?: string;
};

function paymentMethod(provider?: string): 'stars' | 'crypto' {
  return provider === 'telegram_stars' ? 'stars' : 'crypto';
}

function resolveCountry(payment: PaymentLean, user?: UserLean | null): string {
  const fromPayment = (payment.country || '').trim().toUpperCase();
  if (fromPayment && fromPayment !== 'XX') return fromPayment;
  const fromUser = (user?.signupCountry || '').trim().toUpperCase();
  if (fromUser && fromUser !== 'XX') return fromUser;
  return fromPayment || fromUser || 'XX';
}

export async function GET(req: NextRequest) {
  if (!(await adminSessionOk(req))) {
    return NextResponse.json({ message: 'Admin login required.' }, { status: 401 });
  }

  const limitRaw = Number(req.nextUrl.searchParams.get('limit') || 20);
  const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 20, 1), 100);

  await connectDB();

  const payments = (await SlutbotPayment.find({
    status: 'paid',
    walletCredited: true,
  })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .select('planId provider usdAmount starsAmount country userId clientId createdAt updatedAt')
    .lean()) as PaymentLean[];

  const userIds = [...new Set(payments.filter((p) => p.userId).map((p) => String(p.userId)))];
  const usersById = new Map<string, UserLean>();

  if (userIds.length) {
    const users = (await SlutbotUser.find({ _id: { $in: userIds } })
      .select('email name signupCountry')
      .lean()) as UserLean[];
    for (const user of users) {
      usersById.set(String(user._id), user);
    }
  }

  const buyers = payments.map((payment) => {
    const user = payment.userId ? usersById.get(String(payment.userId)) : null;
    const country = resolveCountry(payment, user);
    const method = paymentMethod(payment.provider);
    const paidAt = payment.updatedAt || payment.createdAt;

    return {
      id: String(payment._id),
      country,
      countryLabel: country === 'XX' ? 'Unknown' : countryName(country),
      usdAmount: Number(payment.usdAmount) || 0,
      starsAmount: Number(payment.starsAmount) || 0,
      method,
      planId: payment.planId || '',
      username: user?.name?.trim() || user?.email?.split('@')[0] || null,
      userId: payment.userId ? String(payment.userId) : null,
      paidAt: paidAt ? new Date(paidAt).toISOString() : '',
    };
  });

  return NextResponse.json({ buyers });
}
