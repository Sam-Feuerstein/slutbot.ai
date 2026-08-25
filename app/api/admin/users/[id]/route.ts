import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db/mongodb';
import { SlutbotPayment, SlutbotUser } from '@/lib/models';
import { adminSessionOk } from '@/lib/auth/adminSession';
import { adjustUserDesires, setUserDesires } from '@/lib/users/wallet';

type UserLean = {
  _id: unknown;
  email: string;
  name?: string;
  clientId: string;
  desires?: number;
  banned?: boolean;
  imageGens?: number;
  videoGens?: number;
  createdAt?: Date;
  lastLoginAt?: Date | null;
};

function serializeUser(user: UserLean) {
  return {
    id: String(user._id),
    email: user.email,
    name: user.name || '',
    clientId: user.clientId,
    desires: user.desires ?? 0,
    banned: !!user.banned,
    imageGens: user.imageGens ?? 0,
    videoGens: user.videoGens ?? 0,
    joinedAt: user.createdAt ? new Date(user.createdAt).toISOString() : '',
    lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt).toISOString() : '',
  };
}

async function denyAdmin(req: NextRequest) {
  if (!(await adminSessionOk(req))) {
    return NextResponse.json({ message: 'Admin login required.' }, { status: 401 });
  }
  return null;
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await denyAdmin(req);
  if (denied) return denied;

  const { id } = await ctx.params;
  await connectDB();
  const user = (await SlutbotUser.findById(id).lean()) as UserLean | null;
  if (!user) return NextResponse.json({ message: 'User not found.' }, { status: 404 });

  const purchases = (await SlutbotPayment.find({ clientId: user.clientId, status: 'paid' })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean()) as unknown as Array<{
    _id: unknown;
    planId: string;
    provider: string;
    status: string;
    usdAmount: number;
    starsAmount?: number;
    desires: number;
    createdAt?: Date;
  }>;

  return NextResponse.json({
    user: serializeUser(user),
    purchases: purchases.map((p) => ({
      id: String(p._id),
      planId: p.planId,
      provider: p.provider,
      status: p.status,
      usdAmount: p.usdAmount,
      starsAmount: p.starsAmount ?? 0,
      desires: p.desires,
      createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : '',
    })),
  });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await denyAdmin(req);
  if (denied) return denied;

  const { id } = await ctx.params;
  const body = (await req.json()) as {
    email?: string;
    password?: string;
    name?: string;
    banned?: boolean;
    desires?: number;
    adjustDesires?: number;
  };

  await connectDB();
  const user = await SlutbotUser.findById(id);
  if (!user) return NextResponse.json({ message: 'User not found.' }, { status: 404 });

  if (body.email) {
    const email = body.email.trim().toLowerCase();
    const taken = await SlutbotUser.findOne({ email, _id: { $ne: user._id } });
    if (taken) return NextResponse.json({ message: 'Email already in use.' }, { status: 409 });
    user.email = email;
  }
  if (typeof body.name === 'string') user.name = body.name.trim();
  if (typeof body.banned === 'boolean') user.banned = body.banned;
  if (body.password && body.password.length >= 6) {
    user.passwordHash = await bcrypt.hash(body.password, 10);
  }
  await user.save();

  if (typeof body.desires === 'number' && Number.isFinite(body.desires)) {
    await setUserDesires(id, body.desires);
  } else if (typeof body.adjustDesires === 'number' && Number.isFinite(body.adjustDesires)) {
    await adjustUserDesires(id, body.adjustDesires);
  }

  const fresh = (await SlutbotUser.findById(id).lean()) as UserLean | null;
  if (!fresh) return NextResponse.json({ message: 'User not found.' }, { status: 404 });

  return NextResponse.json({ user: serializeUser(fresh) });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await denyAdmin(req);
  if (denied) return denied;

  const { id } = await ctx.params;
  await connectDB();
  const user = await SlutbotUser.findByIdAndDelete(id);
  if (!user) return NextResponse.json({ message: 'User not found.' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
