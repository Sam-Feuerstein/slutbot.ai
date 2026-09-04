import { NextRequest, NextResponse } from 'next/server';
import { adminSessionOk } from '@/lib/auth/adminSession';
import { getEmailTemplates, setEmailTemplates } from '@/lib/email/settings';
import {
  EMAIL_TEMPLATE_META,
  defaultEmailTemplates,
  type EmailTemplates,
} from '@/lib/email/templates';
import { mailFromAddress, mailFromName, smtpConfigured } from '@/lib/email/send';
import { HELLO_EMAIL } from '@/lib/site';

async function denyAdmin(req: NextRequest) {
  if (!(await adminSessionOk(req))) {
    return NextResponse.json({ message: 'Admin login required.' }, { status: 401 });
  }
  return null;
}

export async function GET(req: NextRequest) {
  const denied = await denyAdmin(req);
  if (denied) return denied;
  const templates = await getEmailTemplates();
  return NextResponse.json({
    templates,
    defaults: defaultEmailTemplates(),
    meta: EMAIL_TEMPLATE_META,
    smtpConfigured: smtpConfigured(),
    fromName: mailFromName(),
    fromEmail: mailFromAddress(),
    helloEmail: HELLO_EMAIL,
  });
}

export async function PUT(req: NextRequest) {
  const denied = await denyAdmin(req);
  if (denied) return denied;
  const body = (await req.json()) as Partial<EmailTemplates>;
  const templates = await setEmailTemplates(body);
  return NextResponse.json({
    templates,
    smtpConfigured: smtpConfigured(),
    fromName: mailFromName(),
    fromEmail: mailFromAddress(),
  });
}
