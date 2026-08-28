'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
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
  daily: Array<{ day: string; paid: number; free: number }>;
};

function formatUsd(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
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
          <p className="mt-1 text-xs text-white/40">
            <Link href="/admin/analytics" className="text-[#ff6b9d] hover:text-white">Open analytics →</Link>
          </p>
        </Panel>
        <Panel className="!p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">App installs</p>
          <p className="mt-3 text-3xl font-black tracking-tight">{data ? data.pwaInstalls : '—'}</p>
          <p className="mt-1 text-xs text-white/40">
            <Link href="/admin/app" className="text-[#ff6b9d] hover:text-white">Open list →</Link>
          </p>
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
