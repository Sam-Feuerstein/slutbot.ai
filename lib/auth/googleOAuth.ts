import { randomBytes } from 'crypto';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { SlutbotUser } from '@/lib/models';
import { getAppUrl } from '@/lib/site';
import { newClientId } from '@/lib/auth/slutbotAuth';
import { requireJwtSecret } from '@/lib/auth/secrets';
import { envValue } from '@/lib/env';
import { trialGrantFields } from '@/lib/trial/grant';

type GoogleOAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

export type GoogleProfile = {
  id: string;
  email: string;
  name: string;
  picture?: string;
  verified_email?: boolean;
};

export function isGoogleOAuthConfigured() {
  return Boolean(envValue('GOOGLE_CLIENT_ID') && envValue('GOOGLE_CLIENT_SECRET'));
}

export function getGoogleOAuthConfig(origin?: string): GoogleOAuthConfig {
  const clientId = envValue('GOOGLE_CLIENT_ID');
  const clientSecret = envValue('GOOGLE_CLIENT_SECRET');
  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth is not configured.');
  }

  const base = (origin || getAppUrl()).replace(/\/$/, '');
  return {
    clientId,
    clientSecret,
    redirectUri: `${base}/api/auth/google/callback`,
  };
}

export function buildGoogleAuthUrl(redirect: string, origin?: string) {
  const { clientId, redirectUri } = getGoogleOAuthConfig(origin);
  const state = jwt.sign(
    { redirect, nonce: randomBytes(16).toString('hex'), purpose: 'google-oauth' },
    requireJwtSecret(),
    { expiresIn: '10m' },
  );

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'online',
    prompt: 'select_account',
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export function parseGoogleOAuthState(state: string | null) {
  if (!state) return null;

  try {
    const decoded = jwt.verify(state, requireJwtSecret()) as {
      redirect?: string;
      purpose?: string;
    };
    if (decoded.purpose !== 'google-oauth') return null;
    return decoded;
  } catch {
    return null;
  }
}

export async function exchangeGoogleCode(code: string, origin?: string) {
  const { clientId, clientSecret, redirectUri } = getGoogleOAuthConfig(origin);
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  const data = (await res.json()) as { access_token?: string; error?: string; error_description?: string };
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || 'Google token exchange failed.');
  }

  return data.access_token;
}

export async function fetchGoogleProfile(accessToken: string): Promise<GoogleProfile> {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = (await res.json()) as GoogleProfile & { error?: { message?: string } };

  if (!res.ok || !data.id || !data.email) {
    throw new Error(data.error?.message || 'Could not load Google profile.');
  }

  if (data.verified_email === false) {
    throw new Error('Google email is not verified.');
  }

  return {
    id: data.id,
    email: data.email.trim().toLowerCase(),
    name: data.name?.trim() || '',
    picture: data.picture,
    verified_email: data.verified_email,
  };
}

export async function findOrCreateGoogleUser(profile: GoogleProfile, country = '', ip = '') {
  await connectDB();

  let user = await SlutbotUser.findOne({ googleId: profile.id });
  if (user) {
    if (user.banned) {
      throw new Error('This account is banned.');
    }
    user.lastLoginAt = new Date();
    if (!user.name && profile.name) user.name = profile.name;
    if (profile.picture) user.avatarUrl = profile.picture;
    if (!user.signupCountry && country) user.signupCountry = country;
    await user.save();
    return user;
  }

  user = await SlutbotUser.findOne({ email: profile.email });
  if (user) {
    if (user.banned) {
      throw new Error('This account is banned.');
    }
    user.googleId = profile.id;
    user.lastLoginAt = new Date();
    if (!user.name && profile.name) user.name = profile.name;
    if (profile.picture) user.avatarUrl = profile.picture;
    if (!user.signupCountry && country) user.signupCountry = country;
    await user.save();
    return user;
  }

  const trial = await trialGrantFields(country, ip);
  const created = await SlutbotUser.create({
    email: profile.email,
    name: profile.name,
    googleId: profile.id,
    avatarUrl: profile.picture || '',
    clientId: newClientId(),
    desires: 0,
    banned: false,
    lastLoginAt: new Date(),
    ...trial,
  });
  return created;
}
