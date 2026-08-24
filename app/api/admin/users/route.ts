import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db/mongodb';
import { SlutbotUser } from '@/lib/models';
import { adminPasswordOk, newClientId } from '@/lib/auth/slutbotAuth';
import { setUserDesires } from '@/lib/users/wallet';

function denyAdmin(req: NextRequest) {
  if (!adminPasswordOk(req)) {
    return NextResponse.json({ message: 'Admin password required.' }, { status: 401 });
  }
  return null;
}

function serializeUser(user: {
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
}) {
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

export async function GET(req: NextRequest) {
  const denied = denyAdmin(req);
  if (denied) return denied;

  await connectDB();
  const q = req.nextUrl.searchParams.get('q')?.trim().toLowerCase() || '';
  const users = (await SlutbotUser.find({}).sort({ createdAt: -1 }).lean()) as unknown as Array<{
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
  }>;
  const filtered = q
    ? users.filter((u) => [u.email, u.name, u.clientId].join(' ').toLowerCase().includes(q))
    : users;

  return NextResponse.json({ users: filtered.map(serializeUser) });
}

export async function POST(req: NextRequest) {
  const denied = denyAdmin(req);
  if (denied) return denied;

  const body = (await req.json()) as {
    email?: string;
    password?: string;
    name?: string;
    desires?: number;
  };
  const email = body.email?.trim().toLowerCase() || '';
  const password = body.password || '';
  const name = body.name?.trim() || '';
  const desires = Math.max(0, Math.round(Number(body.desires) || 0));

  if (!email || !password || password.length < 6) {
    return NextResponse.json({ message: 'Email and password (6+ chars) required.' }, { status: 400 });
  }

  await connectDB();
  const exists = await SlutbotUser.findOne({ email });
  if (exists) {
    return NextResponse.json({ message: 'Email already in use.' }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await SlutbotUser.create({
    email,
    passwordHash,
    name,
    clientId: newClientId(),
    desires,
    banned: false,
  });

  return NextResponse.json({ user: serializeUser(user) }, { status: 201 });
}
