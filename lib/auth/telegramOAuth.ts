import { createHash, createHmac, timingSafeEqual } from 'crypto';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { SlutbotUser } from '@/lib/models';
import { newClientId } from '@/lib/auth/slutbotAuth';
import { requireJwtSecret } from '@/lib/auth/secrets';
import { envValue } from '@/lib/env';
import { trialGrantFields } from '@/lib/trial/grant';
import { telegramPlaceholderEmail } from '@/lib/auth/signInMethod';
import { isBlockedErogramBot } from '@/lib/payments/telegram';
import { SITE_URL } from '@/lib/site';
import {
  normalizeTelegramLoginParams,
  parseTelegramAuthResult,
} from '@/lib/auth/telegramLoginParse';

export { normalizeTelegramLoginParams, parseTelegramAuthResult };

const AUTH_MAX_AGE_SEC = 60 * 60 * 24;

export type TelegramLoginProfile = {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  photoUrl: string;
};

export function telegramLoginBotToken() {
  return envValue('TELEGRAM_PAYMENT_BOT_TOKEN');
}

export function telegramBotIdFromToken(token = telegramLoginBotToken()) {
  const id = token.split(':')[0] || '';
  return /^\d{5,20}$/.test(id) ? id : '';
}

export function telegramOAuthOrigin() {
  return SITE_URL.replace(/\/$/, '');
}

export function isTelegramLoginConfigured() {
  return Boolean(telegramLoginBotToken() && telegramBotIdFromToken());
}

export function buildTelegramAuthUrl(origin = telegramOAuthOrigin()) {
  const botId = telegramBotIdFromToken();
  if (!botId) {
    throw new Error('Telegram sign-in is not configured.');
  }
  const originClean = origin.replace(/\/$/, '');
  const params = new URLSearchParams({
    bot_id: botId,
    origin: originClean,
    request_access: 'write',
    return_to: `${originClean}/api/auth/telegram/callback`,
  });
  return `https://oauth.telegram.org/auth?${params.toString()}`;
}

export function signTelegramOAuthState(redirect: string) {
  return jwt.sign(
    { redirect, nonce: `${Date.now()}`, purpose: 'telegram-oauth' },
    requireJwtSecret(),
    { expiresIn: '10m' },
  );
}

export function parseTelegramOAuthState(state: string | null) {
  if (!state) return null;
  try {
    const decoded = jwt.verify(state, requireJwtSecret()) as {
      redirect?: string;
      purpose?: string;
    };
    if (decoded.purpose !== 'telegram-oauth') return null;
    return decoded;
  } catch {
    return null;
  }
}

function timingSafeHexEqual(left: string, right: string) {
  const a = Buffer.from(left, 'hex');
  const b = Buffer.from(right, 'hex');
  if (a.length !== 32 || b.length !== 32 || a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function verifyTelegramLoginAuth(
  params: Record<string, string | null | undefined>,
  botToken = telegramLoginBotToken(),
): TelegramLoginProfile | null {
  if (!botToken) return null;

  const normalized = normalizeTelegramLoginParams(
    Object.fromEntries(
      Object.entries(params).filter(([, value]) => value != null && String(value).length > 0),
    ) as Record<string, unknown>,
  );
  if (!normalized) return null;

  const authDate = Number(normalized.auth_date);
  if (!Number.isFinite(authDate) || authDate <= 0) return null;
  if (Math.abs(Date.now() / 1000 - authDate) > AUTH_MAX_AGE_SEC) return null;

  const checkParts = Object.keys(normalized)
    .filter((key) => key !== 'hash')
    .sort()
    .map((key) => `${key}=${normalized[key]}`);

  const secret = createHash('sha256').update(botToken).digest();
  const computed = createHmac('sha256', secret).update(checkParts.join('\n')).digest('hex');
  if (!timingSafeHexEqual(computed, normalized.hash)) return null;

  return {
    id: normalized.id,
    firstName: String(normalized.first_name || '').trim(),
    lastName: String(normalized.last_name || '').trim(),
    username: String(normalized.username || '')
      .trim()
      .replace(/^@/, ''),
    photoUrl: String(normalized.photo_url || '').trim(),
  };
}

export function telegramDisplayName(profile: TelegramLoginProfile) {
  const full = `${profile.firstName} ${profile.lastName}`.trim();
  if (full) return full.slice(0, 80);
  if (profile.username) return profile.username.slice(0, 80);
  return `Telegram ${profile.id}`;
}

export async function assertTelegramLoginBotAllowed() {
  if (!isTelegramLoginConfigured()) {
    throw new Error('Telegram sign-in is not configured.');
  }
  const { getTelegramBotIdentity } = await import('@/lib/payments/telegram');
  const identity = await getTelegramBotIdentity();
  if ('error' in identity) {
    throw new Error('Telegram sign-in is not configured.');
  }
  if (isBlockedErogramBot(identity.username)) {
    throw new Error('Telegram sign-in needs the AI SLUTBOT bot token.');
  }
}

export async function findOrCreateTelegramUser(profile: TelegramLoginProfile, country = '', ip = '') {
  await connectDB();

  let user = await SlutbotUser.findOne({ telegramId: profile.id });
  if (user) {
    if (user.banned) {
      throw new Error('This account is banned.');
    }
    user.lastLoginAt = new Date();
    if (!user.name) user.name = telegramDisplayName(profile);
    if (profile.username) user.telegramUsername = profile.username;
    if (profile.photoUrl) user.avatarUrl = profile.photoUrl;
    if (!user.signupCountry && country) user.signupCountry = country;
    await user.save();
    return user;
  }

  const trial = await trialGrantFields(country, ip);
  return SlutbotUser.create({
    email: telegramPlaceholderEmail(profile.id),
    name: telegramDisplayName(profile),
    telegramId: profile.id,
    telegramUsername: profile.username,
    avatarUrl: profile.photoUrl || '',
    clientId: newClientId(),
    desires: 0,
    banned: false,
    lastLoginAt: new Date(),
    ...trial,
  });
}
