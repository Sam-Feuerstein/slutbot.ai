import { NextRequest, NextResponse } from 'next/server';
import { adminSessionOk } from '@/lib/auth/adminSession';
import { setEmailTemplates } from '@/lib/email/settings';
import { smtpConfigured } from '@/lib/email/send';
import {
  CAMPAIGN_AUDIENCES,
  CAMPAIGN_CONFIRM_PHRASE,
  countCampaignRecipients,
  parseCampaignAudience,
  sendCampaignBatch,
  type CampaignAudienceId,
} from '@/lib/email/campaigns';
import type { EmailTemplates } from '@/lib/email/templates';

export const maxDuration = 60;

async function denyAdmin(req: NextRequest) {
  if (!(await adminSessionOk(req))) {
    return NextResponse.json({ message: 'Admin login required.' }, { status: 401 });
  }
  return null;
}

function audiencePayload(id: CampaignAudienceId, count: number) {
  const meta = CAMPAIGN_AUDIENCES.find((item) => item.id === id) || CAMPAIGN_AUDIENCES[0];
  return {
    audience: id,
    label: meta.label,
    hint: meta.hint,
    count,
  };
}

export async function GET(req: NextRequest) {
  const denied = await denyAdmin(req);
  if (denied) return denied;

  const audience = parseCampaignAudience(req.nextUrl.searchParams.get('audience')) || 'invoice_unpaid';
  const count = await countCampaignRecipients(audience);
  return NextResponse.json({
    audiences: CAMPAIGN_AUDIENCES,
    confirmPhrase: CAMPAIGN_CONFIRM_PHRASE,
    smtpConfigured: smtpConfigured(),
    ...audiencePayload(audience, count),
  });
}

export async function POST(req: NextRequest) {
  const denied = await denyAdmin(req);
  if (denied) return denied;

  if (!smtpConfigured()) {
    return NextResponse.json({ message: 'SMTP is not configured.' }, { status: 503 });
  }

  const body = (await req.json().catch(() => null)) as {
    audience?: string;
    confirm?: string;
    afterId?: string;
    templates?: Partial<EmailTemplates>;
  } | null;

  const audience = parseCampaignAudience(body?.audience);
  if (!audience) {
    return NextResponse.json({ message: 'Pick a Launch offer audience.' }, { status: 400 });
  }
  if ((body?.confirm || '').trim() !== CAMPAIGN_CONFIRM_PHRASE) {
    return NextResponse.json({ message: `Type ${CAMPAIGN_CONFIRM_PHRASE} to email this list.` }, { status: 400 });
  }

  if (body?.templates) {
    await setEmailTemplates(body.templates);
  }

  try {
    const result = await sendCampaignBatch({
      audience,
      afterId: body?.afterId,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not send Launch offer.';
    return NextResponse.json({ message }, { status: 500 });
  }
}
