import { NextRequest, NextResponse } from 'next/server';
import {
  exchangeGoogleCode,
  fetchGoogleProfile,
  findOrCreateGoogleUser,
  isGoogleOAuthConfigured,
  parseGoogleOAuthState,
} from '@/lib/auth/googleOAuth';
import { signSlutbotToken } from '@/lib/auth/slutbotAuth';
import { loginHref, safeNextPath } from '@/lib/site';
import { resolveRequestCountry } from '@/lib/geo/tier1';
import { clientIp } from '@/lib/rateLimit';

const OAUTH_LOGIN_COOKIE = 'slutbot_oauth_login';

function oauthErrorRedirect(message: string, origin: string, redirect = '/') {
  const url = new URL(loginHref(redirect), origin);
  url.searchParams.set('error', message);
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  if (!isGoogleOAuthConfigured()) {
    return oauthErrorRedirect('Google sign-in is not configured.', origin);
  }

  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  const googleError = req.nextUrl.searchParams.get('error');

  const parsedState = parseGoogleOAuthState(state);
  const redirect = safeNextPath(parsedState?.redirect);

  if (googleError) {
    return oauthErrorRedirect('Google sign-in was cancelled.', origin, redirect);
  }

  if (!code || !parsedState) {
    return oauthErrorRedirect('Invalid Google sign-in response.', origin, redirect);
  }

  try {
    const accessToken = await exchangeGoogleCode(code, origin);
    const profile = await fetchGoogleProfile(accessToken);
    const user = await findOrCreateGoogleUser(profile, resolveRequestCountry(req.headers), clientIp(req));
    const token = signSlutbotToken(String(user._id));

    const completeUrl = new URL('/login/oauth-complete', origin);
    completeUrl.searchParams.set('redirect', redirect);

    const response = NextResponse.redirect(completeUrl);
    response.cookies.set(OAUTH_LOGIN_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60,
      path: '/',
    });

    return response;
  } catch (err) {
    console.error('Google OAuth callback error:', err);
    return oauthErrorRedirect('Google sign-in failed. Please try again.', origin, redirect);
  }
}
