export const TELEGRAM_PLACEHOLDER_EMAIL_DOMAIN = 'telegram.aislutbot.local';

export function telegramPlaceholderEmail(telegramId: string) {
  return `tg${telegramId}@${TELEGRAM_PLACEHOLDER_EMAIL_DOMAIN}`;
}

export function isTelegramPlaceholderEmail(email?: string | null) {
  return String(email || '')
    .trim()
    .toLowerCase()
    .endsWith(`@${TELEGRAM_PLACEHOLDER_EMAIL_DOMAIN}`);
}

export function signInMethodLabel(user: {
  googleId?: unknown;
  telegramId?: unknown;
  passwordHash?: unknown;
}) {
  const parts: string[] = [];
  if (user.googleId) parts.push('Google');
  if (user.telegramId) parts.push('Telegram');
  if (user.passwordHash) parts.push('Email & password');
  return parts.join(' + ') || 'Unknown';
}
