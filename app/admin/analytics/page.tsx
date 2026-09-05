'use client';

import { useCallback, useEffect, useState } from 'react';
import { countryName } from '@/lib/starsGeo/countries';
import { adminHeaders } from '@/lib/adminApi';
import { PageHeader, Panel } from '../components/AdminUi';

type Summary = {
  totals: {
    clicks: number;
    interactions: number;
    pageViews: number;
    uniqueVisits: number;
    checkoutView: number;
    checkoutPlan: number;
    checkoutMethod: number;
    checkoutPay: number;
    checkoutTutorial: number;
    checkoutName: number;
  };
  byDay: Array<{ day: string; clicks: number; interactions: number; pageViews: number; uniqueVisits: number; checkoutPay: number }>;
  visitsByCountry: Array<{ country: string; visits: number }>;
  recent: Array<{
    name: string;
    kind: string;
    path: string;
    label: string;
    plan: string;
    method: string;
    at: string;
  }>;
};

function DailyVisitsMiniChart({ byDay }: { byDay: Summary['byDay'] }) {
  const max = Math.max(1, ...byDay.map((row) => row.uniqueVisits));
  const w = 640;
  const h = 180;
  const pad = { l: 32, r: 8, t: 12, b: 32 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const barW = innerW / Math.max(byDay.length, 1) - 4;

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-[160px] w-full sm:h-[180px]" role="img" aria-label="Daily unique visits">
        {byDay.map((row, i) => {
          const barH = (row.uniqueVisits / max) * innerH;
          const x = pad.l + i * (innerW / byDay.length) + 2;
          return (
            <g key={row.day}>
              <rect
                x={x}
                y={pad.t + innerH - barH}
                width={Math.max(4, barW)}
                height={barH}
                rx={3}
                fill="#ff2d78"
              />
              <text x={x + barW / 2} y={h - 10} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="9">
                {row.day.slice(5)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/analytics', { headers: adminHeaders() });
      const json = (await res.json()) as Summary & { message?: string };
      if (!res.ok) {
        setError(json.message || 'Could not load analytics.');
        setData(null);
        return;
      }
      setData(json);
    } catch {
      setError('Could not load analytics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const totals = data?.totals;

  return (
    <div>
      <PageHeader
        kicker="Analytics"
        title="Clicks and interactions"
        description="First-party totals from checkout and site clicks. Stored in MongoDB. No payment names or Telegram handles."
      />

      {error ? <p className="mb-4 text-sm text-rose-300">{error}</p> : null}

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[
          { label: 'Unique visitors', value: totals?.uniqueVisits ?? 0 },
          { label: 'Page views', value: totals?.pageViews ?? 0 },
          { label: 'Total clicks', value: totals?.clicks ?? 0 },
          { label: 'Total interactions', value: totals?.interactions ?? 0 },
          { label: 'Checkout views', value: totals?.checkoutView ?? 0 },
          { label: 'Pay clicks', value: totals?.checkoutPay ?? 0 },
        ].map((item) => (
          <Panel key={item.label} className="!p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">{item.label}</p>
            <p className="mt-3 text-3xl font-black tracking-tight">{loading ? '—' : item.value}</p>
          </Panel>
        ))}
      </div>

      <Panel className="mb-6">
        <h2 className="text-lg font-black">Daily unique visits</h2>
        <p className="mt-1 text-sm text-white/45">One count per browser per UTC day.</p>
        <div className="mt-4">
          {data?.byDay.length ? <DailyVisitsMiniChart byDay={data.byDay} /> : <p className="text-sm text-white/40">No visits yet.</p>}
        </div>
      </Panel>

      <Panel className="mb-6">
        <h2 className="text-lg font-black">Last 14 days</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-[11px] uppercase tracking-[0.14em] text-white/35">
              <tr>
                <th className="pb-2 font-semibold">Day</th>
                <th className="pb-2 font-semibold">Unique</th>
                <th className="pb-2 font-semibold">Page views</th>
                <th className="pb-2 font-semibold">Clicks</th>
                <th className="pb-2 font-semibold">Interactions</th>
                <th className="pb-2 font-semibold">Pay</th>
              </tr>
            </thead>
            <tbody>
              {(data?.byDay || []).length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-4 text-white/40">
                    No events yet.
                  </td>
                </tr>
              ) : (
                data?.byDay.map((row) => (
                  <tr key={row.day} className="border-t border-white/8">
                    <td className="py-2">{row.day}</td>
                    <td className="py-2 font-semibold text-white">{row.uniqueVisits}</td>
                    <td className="py-2">{row.pageViews}</td>
                    <td className="py-2">{row.clicks}</td>
                    <td className="py-2">{row.interactions}</td>
                    <td className="py-2">{row.checkoutPay}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel className="mb-6">
        <h2 className="text-lg font-black">Visits by country</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[360px] text-left text-sm">
            <thead className="text-[11px] uppercase tracking-[0.14em] text-white/35">
              <tr>
                <th className="pb-2 font-semibold">Country</th>
                <th className="pb-2 font-semibold">Unique visitors</th>
              </tr>
            </thead>
            <tbody>
              {(data?.visitsByCountry || []).length === 0 ? (
                <tr>
                  <td colSpan={2} className="py-4 text-white/40">
                    No country data yet.
                  </td>
                </tr>
              ) : (
                data?.visitsByCountry.map((row) => (
                  <tr key={row.country} className="border-t border-white/8">
                    <td className="py-2">
                      {row.country === 'XX' ? 'Unknown' : countryName(row.country)}
                      <span className="ml-2 font-mono text-xs text-white/35">{row.country}</span>
                    </td>
                    <td className="py-2 tabular-nums">{row.visits.toLocaleString('en-US')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel>
        <h2 className="text-lg font-black">Recent events</h2>
        <div className="mt-4 space-y-2">
          {(data?.recent || []).length === 0 ? (
            <p className="text-sm text-white/40">No events yet.</p>
          ) : (
            data?.recent.map((row, index) => (
              <p key={`${row.at}-${index}`} className="text-sm text-white/70">
                <span className="font-semibold text-white">{row.name}</span>
                {row.path ? <span className="text-white/40"> · {row.path}</span> : null}
                {row.plan ? <span> · {row.plan}</span> : null}
                {row.method ? <span> · {row.method}</span> : null}
                {row.label ? <span className="text-white/45"> · {row.label}</span> : null}
                {row.at ? <span className="text-white/30"> · {row.at.replace('T', ' ').slice(0, 19)}</span> : null}
              </p>
            ))
          )}
        </div>
      </Panel>
    </div>
  );
}
