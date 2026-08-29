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
    copy: 'Offers, purchase receipts, and password restore templates.',
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
  dailyVisits: Array<{ day: string; visits: number }>;
  visitsByCountry: Array<{ country: string; visits: number }>;
  daily: Array<{ day: string; paid: number; free: number }>;
};

function formatUsd(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function DailyVisitsChart({ daily }: { daily: Overview['dailyVisits'] }) {
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

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-[220px] w-full min-w-[560px]" role="img" aria-label="Unique daily visits">
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
        {points.map((p) => (
          <g key={p.day}>
            <circle cx={p.x} cy={p.y} r={3.5} fill="#ff2d78" />
            <text x={p.x} y={h - 12} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="9">
              {p.day.slice(5)}
            </text>
          </g>
        ))}
      </svg>
      <p className="mt-2 text-xs text-white/45">
        Unique visitors per UTC day — one count per browser, deduplicated by client ID.
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
  const max = Math.max(1, ...daily.flatMap((row) => [row.paid, row.free]));
  const w = 640;
  const h = 220;
  const pad = { l: 28, r: 8, t: 16, b: 36 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const gap = 8;
  const groupW = innerW / Math.max(daily.length, 1);
  const barW = Math.max(4, (groupW - gap) / 2);

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-[220px] w-full min-w-[560px]" role="img" aria-label="Paid vs free users by signup day">
        {daily.map((row, i) => {
          const x0 = pad.l + i * groupW;
          const paidH = (row.paid / max) * innerH;
          const freeH = (row.free / max) * innerH;
          return (
            <g key={row.day}>
              <rect
                x={x0}
                y={pad.t + innerH - paidH}
                width={barW}
                height={paidH}
                rx={3}
                fill="#ff2d78"
              />
              <rect
                x={x0 + barW + 3}
                y={pad.t + innerH - freeH}
                width={barW}
                height={freeH}
                rx={3}
                fill="#6b7280"
              />
              <text x={x0 + barW} y={h - 12} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="9">
                {row.day.slice(5)}
              </text>
            </g>
          );
        })}
      </svg>
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

export default function AdminOverviewPage() {
  const env = usePaymentEnvStatus();
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    void fetch('/api/admin/overview')
      .then(async (res) => {
        const json = (await res.json()) as Overview & { message?: string };
        if (!res.ok) throw new Error(json.message || 'Could not load overview.');
        setData(json);
      })
      .catch((err: Error) => setError(err.message));
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
        description="Totals from real users and paid invoices. No demo numbers."
      />

      {error ? <p className="mb-4 text-sm text-rose-300">{error}</p> : null}

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Panel className="!p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">Total paid</p>
          <p className="mt-3 text-3xl font-black tracking-tight">
            {data ? formatUsd(data.totalPaid) : '—'}
          </p>
          <p className="mt-1 text-xs text-white/40">
            {data ? `${data.paidUsers} paid users` : ''}
          </p>
        </Panel>
        <Panel className="!p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">Total users</p>
          <p className="mt-3 text-3xl font-black tracking-tight">{data ? data.totalUsers : '—'}</p>
          <p className="mt-1 text-xs text-white/40">
            {data ? `${data.freeUsers} free` : ''}
          </p>
        </Panel>
        <Panel className="!p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">Total visits</p>
          <p className="mt-3 text-3xl font-black tracking-tight">{data ? data.totalVisits.toLocaleString('en-US') : '—'}</p>
          <p className="mt-1 text-xs text-white/40">Unique visitors (all time)</p>
        </Panel>
        <Panel className="!p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">App installs</p>
          <p className="mt-3 text-3xl font-black tracking-tight">{data ? data.pwaInstalls : '—'}</p>
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
