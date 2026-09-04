import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db/mongodb';
import { SlutbotUser } from '@/lib/models';
import { signSlutbotToken } from '@/lib/auth/slutbotAuth';
import { setSessionCookie } from '@/lib/auth/sessionCookie';
import { clientIp, rateLimitAllowed } from '@/lib/rateLimit';
import { publicBalanceFields } from '@/lib/users/wallet';

export async function POST(req: NextRequest) {
  if (!rateLimitAllowed({ name: 'login', key: clientIp(req), windowMs: 15 * 60_000, max: 10 })) {
    return NextResponse.json({ message: 'Too many login attempts. Try again later.' }, { status: 429 });
  }

  try {
    const body = (await req.json()) as { email?: string; password?: string };
    const email = body.email?.trim().toLowerCase() || '';
    const password = body.password || '';
    if (!email || !password) {
      return NextResponse.json({ message: 'Email and password required.' }, { status: 400 });
    }

    await connectDB();
    const user = await SlutbotUser.findOne({ email });
    if (!user?.passwordHash) {
      return NextResponse.json(
        { message: user?.googleId || user?.telegramId ? 'Use Google or Telegram to sign in for this account.' : 'Invalid credentials.' },
        { status: 401 },
      );
    }
    if (user.banned) {
      return NextResponse.json({ message: 'This account is banned.' }, { status: 403 });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ message: 'Invalid credentials.' }, { status: 401 });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = signSlutbotToken(String(user._id));
    const res = NextResponse.json({
      email: user.email,
      name: user.name || '',
      avatarUrl: user.avatarUrl || '',
      clientId: user.clientId,
      ...publicBalanceFields(user),
    });
    setSessionCookie(res, token);
    return res;
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ message: 'Server error.' }, { status: 500 });
  }
}
