import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db/mongodb';
import { SlutbotUser } from '@/lib/models';
import { signSlutbotToken } from '@/lib/auth/slutbotAuth';

export async function POST(req: NextRequest) {
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
        { message: user?.googleId ? 'Use Continue with Google for this account.' : 'Invalid credentials.' },
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
    return NextResponse.json({
      token,
      email: user.email,
      name: user.name || '',
      clientId: user.clientId,
      desires: user.desires ?? 0,
    });
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ message: 'Server error.' }, { status: 500 });
  }
}
