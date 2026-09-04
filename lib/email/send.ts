import nodemailer from 'nodemailer';
import { isTelegramPlaceholderEmail } from '@/lib/auth/signInMethod';
import { envValue } from '@/lib/env';
import { applyEmailTokens, baseEmailVars, type EmailTemplateId, type EmailTemplates } from '@/lib/email/templates';
import { getEmailTemplates } from '@/lib/email/settings';
import { HELLO_EMAIL } from '@/lib/site';

type SmtpConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
};

export function smtpConfigured(): boolean {
  return Boolean(envValue('SMTP_HOST') && envValue('SMTP_USER') && envValue('SMTP_PASSWORD'));
}

function smtpConfig(): SmtpConfig | null {
  const host = envValue('SMTP_HOST');
  const user = envValue('SMTP_USER');
  const pass = envValue('SMTP_PASSWORD');
  if (!host || !user || !pass) return null;
  const port = Number(envValue('SMTP_PORT') || '587');
  return {
    host,
    port: Number.isFinite(port) && port > 0 ? port : 587,
    user,
    pass,
    fromName: envValue('SMTP_FROM_NAME') || 'AI SLUTBOT',
    fromEmail: envValue('SMTP_FROM') || HELLO_EMAIL,
  };
}

export function mailFromAddress(): string {
  return smtpConfig()?.fromEmail || HELLO_EMAIL;
}

export function mailFromName(): string {
  return smtpConfig()?.fromName || 'AI SLUTBOT';
}

export function isSendableEmail(email?: string | null): boolean {
  const value = (email || '').trim().toLowerCase();
  if (!value || isTelegramPlaceholderEmail(value)) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function renderHtml(text: string): string {
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const linked = escaped.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" style="color:#ff2d78;text-decoration:underline">$1</a>',
  );
  return `<!DOCTYPE html>
<html>
<body style="margin:0;background:#090505;color:#f5f5f5;font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;line-height:1.6;white-space:pre-wrap;">${linked}</div>
</body>
</html>`;
}

export async function sendPlatformEmail(input: {
  to: string;
  subject: string;
  text: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const to = input.to.trim().toLowerCase();
  if (!isSendableEmail(to)) return { ok: false, error: 'That address cannot receive email.' };

  const cfg = smtpConfig();
  if (!cfg) return { ok: false, error: 'SMTP is not configured.' };

  try {
    const transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.port === 465,
      auth: { user: cfg.user, pass: cfg.pass },
    });
    await transporter.sendMail({
      from: `"${cfg.fromName.replace(/"/g, '')}" <${cfg.fromEmail}>`,
      replyTo: HELLO_EMAIL,
      to,
      subject: input.subject.trim() || 'AI SLUTBOT',
      text: input.text,
      html: renderHtml(input.text),
    });
    return { ok: true };
  } catch (err) {
    console.error('[email] send failed:', err);
    return { ok: false, error: err instanceof Error ? err.message : 'Could not send email.' };
  }
}

export async function sendTemplateEmail(
  templateId: EmailTemplateId,
  input: { to: string; vars?: Record<string, string>; templates?: EmailTemplates },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const templates = input.templates || (await getEmailTemplates());
  const vars = {
    ...baseEmailVars({ name: input.vars?.name, email: input.to }),
    ...input.vars,
  };
  const subjectKey = `${templateId}Subject` as const;
  const bodyKey = `${templateId}Body` as const;
  const source = input.templates || templates;
  return sendPlatformEmail({
    to: input.to,
    subject: applyEmailTokens(source[subjectKey], vars),
    text: applyEmailTokens(source[bodyKey], vars),
  });
}
