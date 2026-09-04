import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db/mongodb';
import { SlutbotPayment, SlutbotUser } from '@/lib/models';
import { authenticateSlutbotUser } from '@/lib/auth/slutbotAuth';
import { PREMIUM_PLANS, planInvoiceCopy } from '@/lib/premiumPlans';
import { publicBalanceFields } from '@/lib/users/wallet';
import { isTelegramPlaceholderEmail, signInMethodLabel } from '@/lib/auth/signInMethod';

function planLabel(planId: string) {
  const plan = PREMIUM_PLANS.find((item) => item.id === planId);
  return plan ? planInvoiceCopy(plan) : planId;
}

function providerLabel(provider: string) {
  if (provider === 'telegram_stars') return 'Telegram Stars';
  if (provider === 'nowpayments') return 'Crypto (USDT)';
  return provider;
}

export async function GET(req: NextRequest) {
  const auth = await authenticateSlutbotUser(req);
  if (!auth) return NextResponse.json({ message: 'Sign in required.' }, { status: 401 });

  await connectDB();
  const user = await SlutbotUser.findById(auth.id);
  if (!user) return NextResponse.json({ message: 'Account not found.' }, { status: 404 });

  const purchases = (await SlutbotPayment.find({ clientId: user.clientId, status: 'paid' })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean()) as unknown as Array<{
    _id: unknown;
    planId: string;
    provider: string;
    usdAmount: number;
    desires: number;
    createdAt?: Date;
  }>;

  const balance = publicBalanceFields(user);
  return NextResponse.json({
    email: user.email,
    name: user.name || '',
    desires: balance.desires,
    paidDesires: balance.paidDesires,
    trialCredits: balance.trialCredits,
    clientId: user.clientId,
    avatarUrl: user.avatarUrl || '',
    hasPassword: Boolean(user.passwordHash),
    googleLinked: Boolean(user.googleId),
    telegramLinked: Boolean(user.telegramId),
    telegramUsername: user.telegramUsername || '',
    signInLabel: signInMethodLabel(user),
    loginEmail: isTelegramPlaceholderEmail(user.email) ? '' : user.email,
    imageGens: user.imageGens ?? 0,
    videoGens: user.videoGens ?? 0,
    joinedAt: user.createdAt ? new Date(user.createdAt).toISOString() : '',
    purchases: purchases.map((purchase) => ({
      id: String(purchase._id),
      planId: purchase.planId,
      planLabel: planLabel(purchase.planId),
      provider: purchase.provider,
      providerLabel: providerLabel(purchase.provider),
      usdAmount: purchase.usdAmount,
      desires: purchase.desires,
      createdAt: purchase.createdAt ? new Date(purchase.createdAt).toISOString() : '',
    })),
  });
}

export async function PATCH(req: NextRequest) {
  const auth = await authenticateSlutbotUser(req);
  if (!auth) return NextResponse.json({ message: 'Sign in required.' }, { status: 401 });

  const body = (await req.json()) as {
    name?: string;
    currentPassword?: string;
    newPassword?: string;
  };

  await connectDB();
  const user = await SlutbotUser.findById(auth.id);
  if (!user) return NextResponse.json({ message: 'Account not found.' }, { status: 404 });

  if (typeof body.name === 'string') {
    user.name = body.name.trim().slice(0, 80);
  }

  if (body.newPassword) {
    if (!user.passwordHash) {
      return NextResponse.json(
        { message: 'This account does not use a password. Sign in with Google or Telegram.' },
        { status: 400 },
      );
    }
    if (!body.currentPassword) {
      return NextResponse.json({ message: 'Current password is required.' }, { status: 400 });
    }
    if (body.newPassword.length < 6) {
      return NextResponse.json({ message: 'New password must be at least 6 characters.' }, { status: 400 });
    }
    const valid = await bcrypt.compare(body.currentPassword, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ message: 'Current password is incorrect.' }, { status: 401 });
    }
    user.passwordHash = await bcrypt.hash(body.newPassword, 10);
  }

  await user.save();

  const balance = publicBalanceFields(user);
  return NextResponse.json({
    email: user.email,
    name: user.name || '',
    desires: balance.desires,
  });
}

export async function DELETE(req: NextRequest) {
  const auth = await authenticateSlutbotUser(req);
  if (!auth) return NextResponse.json({ message: 'Sign in required.' }, { status: 401 });

  await connectDB();
  const deleted = await SlutbotUser.findByIdAndDelete(auth.id);
  if (!deleted) return NextResponse.json({ message: 'Account not found.' }, { status: 404 });

  return NextResponse.json({ ok: true });
}
