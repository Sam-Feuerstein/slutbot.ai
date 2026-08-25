import connectDB from '@/lib/db/mongodb';
import { AnalyticsEvent, AnalyticsStat } from '@/lib/models';
import { isTrackName, type TrackKind, type TrackName } from '@/lib/trackTypes';

export type TrackPayload = {
  name: TrackName;
  kind?: TrackKind;
  path?: string;
  label?: string;
  plan?: string;
  method?: string;
  clientId?: string;
};

function utcDay(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function clip(value: unknown, max = 80): string {
  return String(value ?? '')
    .trim()
    .slice(0, max);
}

export async function recordTrackEvent(input: TrackPayload) {
  if (!isTrackName(input.name)) return;
  const name = input.name;
  const kind: TrackKind = input.kind ?? (name === 'click' ? 'click' : name === 'page_view' || name === 'checkout_view' ? 'view' : 'interaction');
  const path = clip(input.path, 120);
  const label = clip(input.label);
  const plan = clip(input.plan, 32);
  const method = clip(input.method, 16);
  const clientId = clip(input.clientId, 80);
  const day = utcDay();

  await connectDB();

  const incNames = new Set<string>(['interactions', name]);
  if (kind === 'click' || name === 'click') incNames.add('clicks');
  if (kind === 'view' || name === 'page_view') incNames.add('page_views');

  const ops = [...incNames].flatMap((statName) => [
    {
      updateOne: {
        filter: { day: '', name: statName },
        update: { $inc: { count: 1 } },
        upsert: true,
      },
    },
    {
      updateOne: {
        filter: { day, name: statName },
        update: { $inc: { count: 1 } },
        upsert: true,
      },
    },
  ]);

  await Promise.all([
    AnalyticsStat.bulkWrite(ops, { ordered: false }),
    AnalyticsEvent.create({ name, kind, path, label, plan, method, clientId }),
  ]);
}

export async function getAnalyticsSummary() {
  await connectDB();
  const [totals, daily, recent] = await Promise.all([
    AnalyticsStat.find({ day: '' }).lean(),
    AnalyticsStat.find({ day: { $ne: '' } })
      .sort({ day: -1 })
      .limit(200)
      .lean(),
    AnalyticsEvent.find({})
      .sort({ createdAt: -1 })
      .limit(40)
      .lean(),
  ]);

  const totalMap: Record<string, number> = {};
  for (const row of totals as Array<{ name: string; count?: number }>) {
    totalMap[row.name] = row.count ?? 0;
  }

  const days = [...new Set((daily as Array<{ day: string }>).map((row) => row.day))].sort().slice(-14);
  const byDay = days.map((day) => {
    const rows = (daily as Array<{ day: string; name: string; count?: number }>).filter((row) => row.day === day);
    const pick = (name: string) => rows.find((row) => row.name === name)?.count ?? 0;
    return {
      day,
      clicks: pick('clicks'),
      interactions: pick('interactions'),
      pageViews: pick('page_views'),
      checkoutPay: pick('checkout_pay'),
    };
  });

  return {
    totals: {
      clicks: totalMap.clicks ?? 0,
      interactions: totalMap.interactions ?? 0,
      pageViews: totalMap.page_views ?? 0,
      checkoutView: totalMap.checkout_view ?? 0,
      checkoutPlan: totalMap.checkout_plan ?? 0,
      checkoutMethod: totalMap.checkout_method ?? 0,
      checkoutPay: totalMap.checkout_pay ?? 0,
      checkoutTutorial: totalMap.checkout_tutorial ?? 0,
      checkoutName: totalMap.checkout_name ?? 0,
    },
    byDay,
    recent: (recent as Array<{
      name: string;
      kind: string;
      path?: string;
      label?: string;
      plan?: string;
      method?: string;
      createdAt?: Date;
    }>).map((row) => ({
      name: row.name,
      kind: row.kind,
      path: row.path || '',
      label: row.label || '',
      plan: row.plan || '',
      method: row.method || '',
      at: row.createdAt ? new Date(row.createdAt).toISOString() : '',
    })),
  };
}
