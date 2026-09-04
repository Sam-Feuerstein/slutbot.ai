import { NextRequest, NextResponse } from 'next/server';
import { adminSessionOk } from '@/lib/auth/adminSession';
import { EMAIL_TEMPLATE_IDS, type EmailTemplateId, type EmailTemplates } from '@/lib/email/templates';
import { isSendableEmail, sendTemplateEmail, smtpConfigured } from '@/lib/email/send';

export async function POST(req: NextRequest) {
  if (!(await adminSessionOk(req))) {
    return NextResponse.json({ message: 'Admin login required.' }, { status: 401 });
  }

  if (!smtpConfigured()) {
    return NextResponse.json(
      { message: 'SMTP is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASSWORD.' },
      { status: 503 },
    );
  }

  const body = (await req.json().catch(() => null)) as {
    template?: string;
    to?: string;
    templates?: Partial<EmailTemplates>;
  } | null;
  const template = (body?.template || '').trim() as EmailTemplateId;
  if (!EMAIL_TEMPLATE_IDS.includes(template)) {
    return NextResponse.json({ message: 'Unknown email template.' }, { status: 400 });
  }

  const to = (body?.to || '').trim().toLowerCase();
  if (!isSendableEmail(to)) {
    return NextResponse.json({ message: 'Enter a real email address to send a test.' }, { status: 400 });
  }

  const result = await sendTemplateEmail(template, {
    to,
    templates: body?.templates as EmailTemplates | undefined,
    vars: {
      name: 'Test',
      email: to,
      plan: 'Flirt',
      amount: '$19.94',
      desires: '1,500',
      stars: '1,500',
      resetLink: 'https://aislutbot.com/login',
      checkoutUrl: 'https://aislutbot.com/checkout?plan=flirt',
    },
  });
  if (!result.ok) {
    return NextResponse.json({ message: result.error }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
