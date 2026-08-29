import connectDB from '@/lib/db/mongodb';
import { AnalyticsDailyVisitor, AnalyticsEvent, AnalyticsStat, AnalyticsVisitor } from '@/lib/models';
import { countryFromHeaders } from '@/lib/starsGeo/detect';
import { isTrackName, type TrackKind, type TrackName } from '@/lib/trackTypes';

export type TrackPayload = {
  name: TrackName;
  kind?: TrackKind;
  path?: string;
  label?: string;
  plan?: string;
  method?: string;
  clientId?: string;
  ip?: string;
  headers?: Headers;
};

function utcDay(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function clip(value: unknown, max = 80): string {
  return String(value ?? '')
    .trim()
    .slice(0, max);
}

function visitorKey(clientId: string, ip: string): string {
  if (clientId) return clientId;
  if (ip && ip !== 'local') return `ip:${ip}`;
  return '';
}

function lastDays(n: number): string[] {
  const days: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

type StatOp = {
  updateOne: {
    filter: { day: string; name: string };
    update: { $inc: { count: number } };
    upsert: true;
  };
};

function statIncrements(names: string[]): StatOp[] {
  const day = utcDay();
  return names.flatMap((statName) => [
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
}

async function recordUniqueVisit(key: string, country: string) {
  if (!key) return;
  const day = utcDay();
  const code = country || 'XX';

  const [dailyResult, visitorResult] = await Promise.all([
    AnalyticsDailyVisitor.updateOne({ day, visitorKey: key }, { $setOnInsert: { country: code } }, { upsert: true }),
    AnalyticsVisitor.updateOne({ visitorKey: key }, { $setOnInsert: { country: code, firstDay: day } }, { upsert: true }),
  ]);

  const ops: StatOp[] = [];
  if (dailyResult.upsertedCount) {
    ops.push(...statIncrements(['unique_visits']));
  }
  if (visitorResult.upsertedCount) {
    ops.push({
      updateOne: {
        filter: { day: '', name: 'unique_visitors' },
        update: { $inc: { count: 1 } },
        upsert: true,
      },
    });
    ops.push({
      updateOne: {
        filter: { day: '', name: `unique_visits:${code}` },
        update: { $inc: { count: 1 } },
        upsert: true,
      },
    });
  }
  if (ops.length) {
    await AnalyticsStat.bulkWrite(ops, { ordered: false });
  }
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
  const ip = clip(input.ip, 64);
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

  const tasks: Promise<unknown>[] = [
    AnalyticsStat.bulkWrite(ops, { ordered: false }),
    AnalyticsEvent.create({ name, kind, path, label, plan, method, clientId }),
  ];

  if (name === 'page_view') {
    const country = input.headers ? countryFromHeaders(input.headers) : '';
    const key = visitorKey(clientId, ip);
    tasks.push(recordUniqueVisit(key, country));
    if (country) {
      tasks.push(
        AnalyticsStat.bulkWrite(statIncrements([`page_views:${country}`]), { ordered: false }),
      );
    }
  }

  await Promise.all(tasks);
}

export async function getTotalVisits(): Promise<number> {
  await connectDB();
  const row = (await AnalyticsStat.findOne({ day: '', name: 'unique_visitors' }).select('count').lean()) as {
    count?: number;
  } | null;
  if (row?.count) return Math.max(0, Math.round(row.count));

  const legacy = (await AnalyticsStat.findOne({ day: '', name: 'page_views' }).select('count').lean()) as {
    count?: number;
  } | null;
  return Math.max(0, Math.round(legacy?.count ?? 0));
}

export async function getVisitDashboardStats(days = 14) {
  await connectDB();
  const dayList = lastDays(days);

  const [dailyRows, countryRows, totalRow] = await Promise.all([
    AnalyticsStat.find({ day: { $in: dayList }, name: 'unique_visits' }).lean(),
    AnalyticsStat.find({ day: '', name: /^unique_visits:[A-Z]{2}$/ }).lean(),
    AnalyticsStat.findOne({ day: '', name: 'unique_visitors' }).select('count').lean(),
  ]);

  type StatRow = { name?: string; count?: number; day?: string };
  const dailyMap = Object.fromEntries(
    (dailyRows as StatRow[]).map((row) => [row.day, Math.max(0, Math.round(row.count ?? 0))]),
  );

  const visitsByCountry = (countryRows as StatRow[])
    .map((row) => {
      const country = (row.name || '').replace('unique_visits:', '');
      return { country, visits: Math.max(0, Math.round(row.count ?? 0)) };
    })
    .filter((row) => row.country && row.visits > 0)
    .sort((a, b) => b.visits - a.visits);

  const totalUniqueVisitors = Math.max(0, Math.round((totalRow as StatRow | null)?.count ?? 0));

  return {
    totalUniqueVisitors,
    dailyVisits: dayList.map((day) => ({ day, visits: dailyMap[day] ?? 0 })),
    visitsByCountry,
  };
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

  type StatRow = { name?: string; count?: number; day?: string };
  type EventRow = {
    name?: string;
    kind?: string;
    path?: string;
    label?: string;
    plan?: string;
    method?: string;
    createdAt?: Date;
  };

  const totalRows = totals as unknown as StatRow[];
  const dailyRows = daily as unknown as StatRow[];
  const recentRows = recent as unknown as EventRow[];

  const totalMap: Record<string, number> = {};
  for (const row of totalRows) {
    if (!row.name) continue;
    totalMap[row.name] = row.count ?? 0;
  }

  const dayList = lastDays(14);
  const byDay = dayList.map((day) => {
    const rows = dailyRows.filter((row) => row.day === day);
    const pick = (name: string) => rows.find((row) => row.name === name)?.count ?? 0;
    return {
      day,
      clicks: pick('clicks'),
      interactions: pick('interactions'),
      pageViews: pick('page_views'),
      uniqueVisits: pick('unique_visits'),
      checkoutPay: pick('checkout_pay'),
    };
  });

  const visitsByCountry = totalRows
    .filter((row) => /^unique_visits:[A-Z]{2}$/.test(row.name || ''))
    .map((row) => ({
      country: row.name!.replace('unique_visits:', ''),
      visits: row.count ?? 0,
    }))
    .filter((row) => row.visits > 0)
    .sort((a, b) => b.visits - a.visits);

  return {
    totals: {
      clicks: totalMap.clicks ?? 0,
      interactions: totalMap.interactions ?? 0,
      pageViews: totalMap.page_views ?? 0,
      uniqueVisits: totalMap.unique_visitors ?? totalMap.unique_visits ?? 0,
      checkoutView: totalMap.checkout_view ?? 0,
      checkoutPlan: totalMap.checkout_plan ?? 0,
      checkoutMethod: totalMap.checkout_method ?? 0,
      checkoutPay: totalMap.checkout_pay ?? 0,
      checkoutTutorial: totalMap.checkout_tutorial ?? 0,
      checkoutName: totalMap.checkout_name ?? 0,
    },
    byDay,
    visitsByCountry,
    recent: recentRows.map((row) => ({
      name: row.name || '',
      kind: row.kind || '',
      path: row.path || '',
      label: row.label || '',
      plan: row.plan || '',
      method: row.method || '',
      at: row.createdAt ? new Date(row.createdAt).toISOString() : '',
    })),
  };
}
