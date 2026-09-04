import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { SlutbotUser } from '@/lib/models';
import { authenticateSlutbotToken } from '@/lib/auth/slutbotAuth';
import { OAUTH_LOGIN_COOKIE, setSessionCookie } from '@/lib/auth/sessionCookie';
import { publicBalanceFields } from '@/lib/users/wallet';

export async function completeOAuthSession(req: NextRequest) {
  const token = req.cookies.get(OAUTH_LOGIN_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ message: 'Sign-in session expired.' }, { status: 401 });
  }

  try {
    const authUser = await authenticateSlutbotToken(token);
    if (!authUser) {
      return NextResponse.json({ message: 'Sign-in session expired.' }, { status: 401 });
    }

    await connectDB();
    const user = await SlutbotUser.findById(authUser.id);
    if (!user || user.banned) {
      return NextResponse.json({ message: 'This account is banned.' }, { status: 403 });
    }

    const response = NextResponse.json({
      email: user.email,
      name: user.name || '',
      avatarUrl: user.avatarUrl || '',
      clientId: user.clientId,
      ...publicBalanceFields(user),
    });
    setSessionCookie(response, token);
    response.cookies.set(OAUTH_LOGIN_COOKIE, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    return response;
  } catch (err) {
    console.error('OAuth complete error:', err);
    return NextResponse.json({ message: 'Could not complete sign-in.' }, { status: 500 });
  }
}
