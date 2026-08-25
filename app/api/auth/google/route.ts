import { NextRequest, NextResponse } from 'next/server';
import { buildGoogleAuthUrl, isGoogleOAuthConfigured } from '@/lib/auth/googleOAuth';
import { loginHref, safeNextPath } from '@/lib/site';

export async function GET(req: NextRequest) {
  if (!isGoogleOAuthConfigured()) {
    return NextResponse.json({ message: 'Google sign-in is not configured.' }, { status: 503 });
  }

  try {
    const redirect = safeNextPath(req.nextUrl.searchParams.get('redirect'));
    const url = buildGoogleAuthUrl(redirect, req.nextUrl.origin);
    return NextResponse.redirect(url);
  } catch (err) {
    console.error('Google OAuth start error:', err);
    return NextResponse.redirect(loginHref('/'));
  }
}
