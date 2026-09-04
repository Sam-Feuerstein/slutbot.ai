import mongoose from 'mongoose';
import connectDB from '@/lib/db/mongodb';
import { AnalyticsEvent, EmailCampaignSend, SlutbotPayment, SlutbotUser } from '@/lib/models';
import { isSendableEmail, sendTemplateEmail, smtpConfigured } from '@/lib/email/send';
import { getEmailTemplates } from '@/lib/email/settings';
import { getCheckoutPlan } from '@/lib/payments/catalog';
import { SITE_URL, checkoutHref } from '@/lib/site';

export const CAMPAIGN_BATCH_SIZE = 12;
export const CAMPAIGN_CONFIRM_PHRASE = 'SEND';
const RECENT_SEND_DAYS = 7;

export const CAMPAIGN_AUDIENCES = [
  {
    id: 'invoice_unpaid',
    label: 'Invoice created, never paid',
    hint: 'Opened Telegram checkout and got an invoice, but never finished payment. Best abandon list.',
  },
  {
    id: 'checkout_reached',
    label: 'Reached checkout',
    hint: 'Signed-in people who opened checkout or started a payment in the last 30 days of tracked views, plus anyone who ever generated an invoice.',
  },
] as const;

export type CampaignAudienceId = (typeof CAMPAIGN_AUDIENCES)[number]['id'];

export type CampaignRecipient = {
  userId: string;
  email: string;
  name: string;
  planId: string;
  plan: string;
};

function isAudienceId(value: string): value is CampaignAudienceId {
  return CAMPAIGN_AUDIENCES.some((item) => item.id === value);
}

export function parseCampaignAudience(value?: string | null): CampaignAudienceId | null {
  const id = (value || '').trim();
  return isAudienceId(id) ? id : null;
}

function planLabel(planId?: string | null) {
  const plan = planId ? getCheckoutPlan(planId) : null;
  return plan?.tier || 'Flirt';
}

function sendableUserFilter() {
  return {
    banned: { $ne: true },
    email: { $exists: true, $nin: [null, ''], $not: /telegram\.aislutbot\.local$/i },
  };
}

async function unpaidInvoiceClientIds() {
  const paid = await SlutbotPayment.distinct('clientId', { status: 'paid' });
  const paidSet = new Set((paid as string[]).filter(Boolean));
  const pending = (await SlutbotPayment.aggregate([
    { $match: { status: 'pending' } },
    { $sort: { createdAt: -1 } },
    { $group: { _id: '$clientId', planId: { $first: '$planId' }, userId: { $first: '$userId' } } },
  ])) as Array<{ _id: string; planId?: string; userId?: unknown }>;
  return pending.filter((row) => row._id && !paidSet.has(row._id));
}

async function checkoutClientIds() {
  const fromViews = (await AnalyticsEvent.distinct('clientId', {
    name: 'checkout_view',
    clientId: { $nin: [null, ''] },
  })) as string[];
  const fromPayClicks = (await AnalyticsEvent.distinct('clientId', {
    name: 'checkout_pay',
    clientId: { $nin: [null, ''] },
  })) as string[];
  const fromPayments = (await SlutbotPayment.distinct('clientId')) as string[];
  return [...new Set([...fromViews, ...fromPayClicks, ...fromPayments].filter(Boolean))];
}

async function latestPlanByClientId(clientIds: string[]) {
  const map = new Map<string, string>();
  if (!clientIds.length) return map;
  const rows = (await SlutbotPayment.aggregate([
    { $match: { clientId: { $in: clientIds } } },
    { $sort: { createdAt: -1 } },
    { $group: { _id: '$clientId', planId: { $first: '$planId' } } },
  ])) as Array<{ _id: string; planId?: string }>;
  for (const row of rows) {
    if (row._id && row.planId) map.set(row._id, row.planId);
  }
  return map;
}

function toRecipient(
  user: { _id: unknown; email?: string; name?: string; clientId?: string },
  planByClient: Map<string, string>,
): CampaignRecipient | null {
  const email = (user.email || '').trim().toLowerCase();
  if (!isSendableEmail(email)) return null;
  const planId = planByClient.get(user.clientId || '') || 'flirt';
  return {
    userId: String(user._id),
    email,
    name: user.name || '',
    planId,
    plan: planLabel(planId),
  };
}

async function usersForClientIds(clientIds: string[], afterId?: string, limit?: number) {
  if (!clientIds.length) return [];
  const filter: Record<string, unknown> = {
    ...sendableUserFilter(),
    clientId: { $in: clientIds },
  };
  if (afterId && mongoose.isValidObjectId(afterId)) {
    filter._id = { $gt: new mongoose.Types.ObjectId(afterId) };
  }
  const query = SlutbotUser.find(filter).select('_id email name clientId').sort({ _id: 1 });
  if (limit) query.limit(limit);
  return (await query.lean()) as Array<{ _id: unknown; email?: string; name?: string; clientId?: string }>;
}

export async function countCampaignRecipients(audience: CampaignAudienceId): Promise<number> {
  await connectDB();
  if (audience === 'invoice_unpaid') {
    const pending = await unpaidInvoiceClientIds();
    if (!pending.length) return 0;
    return SlutbotUser.countDocuments({
      ...sendableUserFilter(),
      clientId: { $in: pending.map((row) => row._id) },
    });
  }

  const clientIds = await checkoutClientIds();
  if (!clientIds.length) return 0;
  return SlutbotUser.countDocuments({
    ...sendableUserFilter(),
    clientId: { $in: clientIds },
  });
}

export async function listCampaignRecipients(
  audience: CampaignAudienceId,
  input: { afterId?: string; limit: number },
): Promise<{ recipients: CampaignRecipient[]; done: boolean; afterId: string }> {
  await connectDB();
  const empty = { recipients: [] as CampaignRecipient[], done: true, afterId: input.afterId || '' };

  if (audience === 'invoice_unpaid') {
    const pending = await unpaidInvoiceClientIds();
    const clientIds = pending.map((row) => row._id);
    if (!clientIds.length) return empty;
    const users = await usersForClientIds(clientIds, input.afterId, input.limit);
    const planByClient = new Map(pending.map((row) => [row._id, row.planId || 'flirt']));
    return {
      recipients: users.map((user) => toRecipient(user, planByClient)).filter((row): row is CampaignRecipient => Boolean(row)),
      done: users.length < input.limit,
      afterId: users.length ? String(users[users.length - 1]._id) : input.afterId || '',
    };
  }

  const clientIds = await checkoutClientIds();
  if (!clientIds.length) return empty;
  const users = await usersForClientIds(clientIds, input.afterId, input.limit);
  const planByClient = await latestPlanByClientId(clientIds);
  return {
    recipients: users.map((user) => toRecipient(user, planByClient)).filter((row): row is CampaignRecipient => Boolean(row)),
    done: users.length < input.limit,
    afterId: users.length ? String(users[users.length - 1]._id) : input.afterId || '',
  };
}

async function recentlyEmailedUserIds(userIds: string[], audience: CampaignAudienceId) {
  if (!userIds.length) return new Set<string>();
  const since = new Date(Date.now() - RECENT_SEND_DAYS * 24 * 60 * 60 * 1000);
  const rows = (await EmailCampaignSend.find({
    audience,
    template: 'offer',
    status: 'sent',
    createdAt: { $gte: since },
    userId: { $in: userIds },
  })
    .select('userId')
    .lean()) as Array<{ userId?: unknown }>;
  return new Set(rows.map((row) => String(row.userId)));
}

export async function sendCampaignBatch(input: {
  audience: CampaignAudienceId;
  afterId?: string;
}): Promise<{
  sent: number;
  failed: number;
  skipped: number;
  done: boolean;
  afterId: string;
  errors: string[];
}> {
  if (!smtpConfigured()) {
    throw new Error('SMTP is not configured.');
  }

  const templates = await getEmailTemplates();
  const batch = await listCampaignRecipients(input.audience, {
    afterId: input.afterId,
    limit: CAMPAIGN_BATCH_SIZE,
  });
  if (!batch.recipients.length) {
    return { sent: 0, failed: 0, skipped: 0, done: batch.done, afterId: batch.afterId, errors: [] };
  }

  const already = await recentlyEmailedUserIds(
    batch.recipients.map((row) => row.userId),
    input.audience,
  );

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const recipient of batch.recipients) {
    if (already.has(recipient.userId)) {
      skipped += 1;
      continue;
    }

    const checkoutUrl = `${SITE_URL}${checkoutHref({ plan: recipient.planId || 'flirt' })}`;
    const result = await sendTemplateEmail('offer', {
      to: recipient.email,
      templates,
      vars: {
        name: recipient.name,
        email: recipient.email,
        plan: recipient.plan,
        checkoutUrl,
      },
    });

    await EmailCampaignSend.create({
      audience: input.audience,
      template: 'offer',
      userId: recipient.userId,
      email: recipient.email,
      planId: recipient.planId,
      status: result.ok ? 'sent' : 'failed',
      error: result.ok ? '' : result.error,
    });

    if (result.ok) sent += 1;
    else {
      failed += 1;
      if (errors.length < 5) errors.push(`${recipient.email}: ${result.error}`);
    }
  }

  return { sent, failed, skipped, done: batch.done, afterId: batch.afterId, errors };
}
