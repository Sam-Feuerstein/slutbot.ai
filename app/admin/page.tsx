'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { countryName } from '@/lib/starsGeo/countries';
import { PageHeader, Panel, StatusChip, usePaymentEnvStatus } from './components/AdminUi';

const CARDS = [
  {
    href: '/admin/payments/nowpayments',
    title: 'NOWPayments',
    copy: 'Erogram NOWPayments account. USD pack prices.',
    key: 'now' as const,
  },
  {
    href: '/admin/payments/telegram',
    title: 'Telegram Stars',
    copy: 'Erogram VIP payment bot. Stars prices on that page.',
    key: 'tg' as const,
  },
  {
    href: '/admin/emails',
    title: 'Email',
    copy: 'Welcome email, purchase receipts, and SMTP from hello@aislutbot.com.',
    key: 'email' as const,
  },
  {
    href: '/admin/analytics',
    title: 'Analytics',
    copy: 'Total visits, clicks, and checkout Pay / pack / method totals.',
    key: 'users' as const,
  },
  {
    href: '/admin/prompts',
    title: 'Prompts',
    copy: 'Hidden nude prompts used on every image and video generation.',
    key: 'users' as const,
  },
  {
    href: '/admin/samples',
    title: 'Sample gallery',
    copy: 'Homepage examples + before/after. Upload, reorder, clicks and likes.',
    key: 'users' as const,
  },
];

type Overview = {
  totalPaid: number;
  totalUsers: number;
  paidUsers: number;
  freeUsers: number;
  pwaInstalls: number;
  totalVisits: number;
  hourVisits: number;
  todayVisits: number;
  hourlyVisits: Array<{ hour: string; visits: number }>;
  todayImages: number;
  todayVideos: number;
  hourImages: number;
  hourVideos: number;
  dailyVisits: Array<{ day: string; visits: number }>;
  visitsByCountry: Array<{ country: string; visits: number }>;
  daily: Array<{ day: string; paid: number; free: number }>;
  dailyGenerations: Array<{ day: string; images: number; videos: number }>;
  totalImages: number;
  totalVideos: number;
};

function formatDay(day: string) {
  const [, month, date] = day.split('-');
  return `${month}-${date}`;
}

function ChartTooltip({
  x,
  y,
  title,
  lines,
}: {
  x: number | string;
  y: number | string;
  title: string;
  lines: string[];
}) {
  return (
    <div
      className="pointer-events-none absolute z-10 min-w-[8.5rem] -translate-x-1/2 -translate-y-full rounded-lg border border-white/15 bg-[#141414] px-2.5 py-2 text-[11px] leading-snug text-white shadow-[0_8px_24px_rgba(0,0,0,0.45)]"
      style={{ left: x, top: typeof y === 'number' ? y - 10 : y }}
    >
      <p className="font-semibold text-white/90">{title}</p>
      {lines.map((line) => (
        <p key={line} className="mt-0.5 tabular-nums text-white/65">
          {line}
        </p>
      ))}
    </div>
  );
}

function formatUsd(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function DailyVisitsChart({ daily }: { daily: Overview['dailyVisits'] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...daily.map((row) => row.visits));
  const w = 640;
  const h = 220;
  const pad = { l: 36, r: 12, t: 16, b: 36 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const step = innerW / Math.max(daily.length - 1, 1);

  const points = daily.map((row, i) => {
    const x = pad.l + i * step;
    const y = pad.t + innerH - (row.visits / max) * innerH;
    return { x, y, ...row };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1]?.x ?? pad.l} ${pad.t + innerH} L ${points[0]?.x ?? pad.l} ${pad.t + innerH} Z`;
  const active = hover != null ? points[hover] : null;

  return (
    <div className="relative" onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-[180px] w-full sm:h-[220px]" role="img" aria-label="Unique daily visits">
        <defs>
          <linearGradient id="visitsFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff2d78" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#ff2d78" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
          const y = pad.t + innerH - tick * innerH;
          const value = Math.round(max * tick);
          return (
            <g key={tick}>
              <line x1={pad.l} y1={y} x2={w - pad.r} y2={y} stroke="rgba(255,255,255,0.06)" />
              <text x={pad.l - 6} y={y + 3} textAnchor="end" fill="rgba(255,255,255,0.35)" fontSize="9">
                {value}
              </text>
            </g>
          );
        })}
        <path d={areaPath} fill="url(#visitsFill)" />
        <path d={linePath} fill="none" stroke="#ff2d78" strokeWidth="2.5" strokeLinejoin="round" />
        {points.map((p, i) => (
          <g key={p.day}>
            <circle cx={p.x} cy={p.y} r={hover === i ? 5 : 3.5} fill="#ff2d78" />
            {i % 2 === 0 || i === points.length - 1 ? (
              <text x={p.x} y={h - 12} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="9">
                {formatDay(p.day)}
              </text>
            ) : null}
            <rect
              x={p.x - step / 2}
              y={pad.t}
              width={Math.max(step, 16)}
              height={innerH}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
          </g>
        ))}
      </svg>
      {active ? (
        <ChartTooltip
          x={(active.x / w) * 100 + '%'}
          y={(active.y / h) * 220}
          title={active.day}
          lines={[`${active.visits.toLocaleString('en-US')} unique visits`]}
        />
      ) : null}
      <p className="mt-2 text-xs text-white/45">
        Unique visitors per UTC day — one count per browser, deduplicated by client ID. Hover a day for the exact count.
      </p>
    </div>
  );
}

function VisitsByCountryChart({ rows }: { rows: Overview['visitsByCountry'] }) {
  const top = rows.slice(0, 12);
  const max = Math.max(1, ...top.map((row) => row.visits));
  const total = rows.reduce((sum, row) => sum + row.visits, 0);

  if (!top.length) {
    return <p className="text-sm text-white/40">No country data yet. Country is detected from CDN headers on each visit.</p>;
  }

  return (
    <div className="space-y-3">
      {top.map((row) => {
        const pct = total ? Math.round((row.visits / total) * 100) : 0;
        const width = `${Math.max(2, (row.visits / max) * 100)}%`;
        const label = row.country === 'XX' ? 'Unknown' : countryName(row.country);
        return (
          <div key={row.country}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium text-white/85">
                {label}
                <span className="ml-2 font-mono text-[11px] text-white/35">{row.country}</span>
              </span>
              <span className="tabular-nums text-white/55">
                {row.visits.toLocaleString('en-US')} <span className="text-white/30">({pct}%)</span>
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/8">
              <div className="h-full rounded-full bg-gradient-to-r from-[#ff2d78] to-[#ff6b9d]" style={{ width }} />
            </div>
          </div>
        );
      })}
      {rows.length > top.length ? (
        <p className="text-xs text-white/35">+ {rows.length - top.length} more countries</p>
      ) : null}
    </div>
  );
}

function PaidFreeChart({ daily }: { daily: Overview['daily'] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...daily.flatMap((row) => [row.paid, row.free]));
  const w = 640;
  const h = 220;
  const pad = { l: 28, r: 8, t: 16, b: 36 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const gap = 8;
  const groupW = innerW / Math.max(daily.length, 1);
  const barW = Math.max(4, (groupW - gap) / 2);
  const active = hover != null ? daily[hover] : null;
  const activeX = hover != null ? pad.l + hover * groupW + barW : 0;

  return (
    <div className="relative" onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-[180px] w-full sm:h-[220px]" role="img" aria-label="Paid vs free users by signup day">
        {daily.map((row, i) => {
          const x0 = pad.l + i * groupW;
          const paidH = (row.paid / max) * innerH;
          const freeH = (row.free / max) * innerH;
          return (
            <g key={row.day} onMouseEnter={() => setHover(i)}>
              <rect
                x={x0}
                y={pad.t + innerH - paidH}
                width={barW}
                height={Math.max(paidH, 0)}
                rx={3}
                fill="#ff2d78"
              />
              <rect
                x={x0 + barW + 3}
                y={pad.t + innerH - freeH}
                width={barW}
                height={Math.max(freeH, 0)}
                rx={3}
                fill="#6b7280"
              />
              <rect x={x0} y={pad.t} width={groupW} height={innerH} fill="transparent" />
              {i % 2 === 0 || i === daily.length - 1 ? (
                <text x={x0 + barW} y={h - 12} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="9">
                  {formatDay(row.day)}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      {active ? (
        <ChartTooltip
          x={`${(activeX / w) * 100}%`}
          y={28}
          title={active.day}
          lines={[`${active.paid} paid signups`, `${active.free} free signups`]}
        />
      ) : null}
      <div className="mt-2 flex gap-4 text-xs text-white/50">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-[#ff2d78]" /> Paid signups
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-[#6b7280]" /> Free signups
        </span>
      </div>
    </div>
  );
}

function DailyGenerationsChart({ daily }: { daily: Overview['dailyGenerations'] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...daily.flatMap((row) => [row.images, row.videos]));
  const w = 640;
  const h = 220;
  const pad = { l: 28, r: 8, t: 16, b: 36 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const gap = 8;
  const groupW = innerW / Math.max(daily.length, 1);
  const barW = Math.max(4, (groupW - gap) / 2);
  const active = hover != null ? daily[hover] : null;
  const activeX = hover != null ? pad.l + hover * groupW + barW : 0;

  return (
    <div className="relative" onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-[180px] w-full sm:h-[220px]" role="img" aria-label="Images and videos generated per day">
        {daily.map((row, i) => {
          const x0 = pad.l + i * groupW;
          const imageH = (row.images / max) * innerH;
          const videoH = (row.videos / max) * innerH;
          return (
            <g key={row.day} onMouseEnter={() => setHover(i)}>
              <rect
                x={x0}
                y={pad.t + innerH - imageH}
                width={barW}
                height={Math.max(imageH, 0)}
                rx={3}
                fill="#ff2d78"
              />
              <rect
                x={x0 + barW + 3}
                y={pad.t + innerH - videoH}
                width={barW}
                height={Math.max(videoH, 0)}
                rx={3}
                fill="#60a5fa"
              />
              <rect x={x0} y={pad.t} width={groupW} height={innerH} fill="transparent" />
              {i % 2 === 0 || i === daily.length - 1 ? (
                <text x={x0 + barW} y={h - 12} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="9">
                  {formatDay(row.day)}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      {active ? (
        <ChartTooltip
          x={`${(activeX / w) * 100}%`}
          y={28}
          title={active.day}
          lines={[
            `${active.images} images`,
            `${active.videos} videos`,
            `${active.images + active.videos} total`,
          ]}
        />
      ) : null}
      <div className="mt-2 flex gap-4 text-xs text-white/50">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-[#ff2d78]" /> Images
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-[#60a5fa]" /> Videos
        </span>
      </div>
    </div>
  );
}

function formatHourLabel(hour: string) {
  const hh = Number(hour.slice(11, 13));
  return `${String(hh).padStart(2, '0')}h`;
}

function HourlyVisitsStrip({ hourly }: { hourly: Overview['hourlyVisits'] }) {
  const max = Math.max(1, ...hourly.map((row) => row.visits));
  if (!hourly.length) return <p className="text-sm text-white/40">No hourly visits yet.</p>;
  return (
    <div>
      <div className="flex h-16 items-end gap-0.5 sm:h-20 sm:gap-1">
        {hourly.map((row) => (
          <div key={row.hour} className="flex min-w-0 flex-1 flex-col items-center justify-end">
            <span className="mb-1 hidden text-[9px] tabular-nums text-white/40 sm:block">
              {row.visits || ''}
            </span>
            <div
              className="w-full rounded-t bg-[#ff2d78]"
              style={{ height: `${Math.max(row.visits ? 8 : 2, (row.visits / max) * 100)}%` }}
              title={`${formatHourLabel(row.hour)} · ${row.visits} unique`}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[9px] text-white/30 sm:text-[10px]">
        <span>{formatHourLabel(hourly[0].hour)}</span>
        <span>Last 24h UTC</span>
        <span>{formatHourLabel(hourly[hourly.length - 1].hour)}</span>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Panel className="!p-4 sm:!p-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40 sm:text-[11px]">{label}</p>
      <p className="mt-2 text-2xl font-black tracking-tight tabular-nums sm:mt-3 sm:text-3xl">{value}</p>
      {hint ? <p className="mt-1 text-xs text-white/40">{hint}</p> : null}
    </Panel>
  );
}

export default function AdminOverviewPage() {
  const env = usePaymentEnvStatus();
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      void fetch('/api/admin/overview')
        .then(async (res) => {
          const json = (await res.json()) as Overview & { message?: string };
          if (!res.ok) throw new Error(json.message || 'Could not load overview.');
          if (!cancelled) {
            setData(json);
            setError('');
          }
        })
        .catch((err: Error) => {
          if (!cancelled) setError(err.message);
        });
    };
    load();
    const timer = window.setInterval(load, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const connected = {
    now: env.nowpayments,
    tg: env.telegram,
    email: false,
    users: true,
  };

  return (
    <div>
      <PageHeader
        kicker="Control room"
        title="Live admin overview"
        description="Live visits and generations at the top. Totals below are from real users and paid invoices. Refreshes every 30 seconds."
      />

      {error ? <p className="mb-4 text-sm text-rose-300">{error}</p> : null}

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Visits this hour"
          value={data ? data.hourVisits.toLocaleString('en-US') : '—'}
          hint="Unique browsers, current UTC hour"
        />
        <StatCard
          label="Visits today"
          value={data ? data.todayVisits.toLocaleString('en-US') : '—'}
          hint="Unique visitors since 00:00 UTC"
        />
        <StatCard
          label="Photos today"
          value={data ? data.todayImages.toLocaleString('en-US') : '—'}
          hint={data ? `${data.hourImages} this hour` : 'Image generations'}
        />
        <StatCard
          label="Videos today"
          value={data ? data.todayVideos.toLocaleString('en-US') : '—'}
          hint={data ? `${data.hourVideos} this hour` : 'Video generations'}
        />
      </div>

      <Panel className="mb-6">
        <h2 className="text-base font-black sm:text-lg">Hourly visits</h2>
        <p className="mt-1 text-sm text-white/45">Unique visitors in each of the last 24 UTC hours.</p>
        <div className="mt-4">
          {data ? <HourlyVisitsStrip hourly={data.hourlyVisits || []} /> : <p className="text-sm text-white/40">Loading…</p>}
        </div>
      </Panel>

      <div className="mb-6 grid gap-3 sm:mb-8 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
        <Panel className="!p-4 sm:!p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40 sm:text-[11px]">Total paid</p>
          <p className="mt-2 text-2xl font-black tracking-tight sm:mt-3 sm:text-3xl">
            {data ? formatUsd(data.totalPaid) : '—'}
          </p>
          <p className="mt-1 text-xs text-white/40">
            {data ? `${data.paidUsers} paid users` : ''}
          </p>
        </Panel>
        <Panel className="!p-4 sm:!p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40 sm:text-[11px]">Total users</p>
          <p className="mt-2 text-2xl font-black tracking-tight sm:mt-3 sm:text-3xl">{data ? data.totalUsers : '—'}</p>
          <p className="mt-1 text-xs text-white/40">
            {data ? `${data.freeUsers} free` : ''}
          </p>
        </Panel>
        <Panel className="!p-4 sm:!p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40 sm:text-[11px]">Total visits</p>
          <p className="mt-2 text-2xl font-black tracking-tight sm:mt-3 sm:text-3xl">{data ? data.totalVisits.toLocaleString('en-US') : '—'}</p>
          <p className="mt-1 text-xs text-white/40">Unique visitors (all time)</p>
        </Panel>
        <Panel className="!p-4 sm:!p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40 sm:text-[11px]">App installs</p>
          <p className="mt-2 text-2xl font-black tracking-tight sm:mt-3 sm:text-3xl">{data ? data.pwaInstalls : '—'}</p>
          <p className="mt-1 text-xs text-white/40">
            <Link href="/admin/app" className="text-[#ff6b9d] hover:text-white">Open list →</Link>
          </p>
        </Panel>
      </div>

      <div className="mb-8 grid gap-4 lg:grid-cols-5">
        <Panel className="lg:col-span-3">
          <h2 className="text-lg font-black">Daily visits</h2>
          <p className="mt-1 text-sm text-white/45">Unique visitors per day over the last 14 UTC days.</p>
          <div className="mt-5">
            {data ? <DailyVisitsChart daily={data.dailyVisits} /> : <p className="text-sm text-white/40">Loading…</p>}
          </div>
        </Panel>
        <Panel className="lg:col-span-2">
          <h2 className="text-lg font-black">Visits by country</h2>
          <p className="mt-1 text-sm text-white/45">Unique visitors by first-seen country (CDN geo headers).</p>
          <div className="mt-5">
            {data ? <VisitsByCountryChart rows={data.visitsByCountry} /> : <p className="text-sm text-white/40">Loading…</p>}
          </div>
        </Panel>
      </div>

      <Panel className="mb-8">
        <h2 className="text-lg font-black">Generations per day</h2>
        <p className="mt-1 text-sm text-white/45">
          Images and videos generated in the last 14 UTC days.
          {data ? ` ${data.totalImages} images · ${data.totalVideos} videos in this window.` : ''}
        </p>
        <div className="mt-5">
          {data ? <DailyGenerationsChart daily={data.dailyGenerations ?? []} /> : <p className="text-sm text-white/40">Loading…</p>}
        </div>
      </Panel>

      <Panel className="mb-8">
        <h2 className="text-lg font-black">Paid vs free daily</h2>
        <p className="mt-1 text-sm text-white/45">New accounts in the last 14 days, split by whether they have a paid invoice.</p>
        <div className="mt-5">
          {data ? <PaidFreeChart daily={data.daily} /> : <p className="text-sm text-white/40">Loading…</p>}
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        {CARDS.map((card) => (
          <Link key={card.href} href={card.href} className="group">
            <Panel className="h-full transition group-hover:border-[#ff2d78]/40 group-hover:bg-white/[0.06]">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-xl font-black">{card.title}</h2>
                <StatusChip connected={connected[card.key]} />
              </div>
              <p className="mt-2 text-sm leading-relaxed text-white/50">{card.copy}</p>
              <p className="mt-5 text-sm font-bold text-[#ff6b9d] group-hover:text-white">Open →</p>
            </Panel>
          </Link>
        ))}
      </div>
    </div>
  );
}
