'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PageHeader, Panel } from '../components/AdminUi';

type UsageReport = {
  summary: {
    totalUsers: number;
    payingUsers: number;
    repeatBuyers: number;
    totalPurchases: number;
    totalStarsSold: number;
    totalRevenueUsd: number;
    totalStarsSpentByBuyers: number;
    totalStarsRemainingWithBuyers: number;
    platformUtilization: number;
    avgUtilizationPerBuyer: number;
    buyersFullyConsumed: number;
    buyersMostlyUnused: number;
    buyersZeroSpend: number;
    nonBuyersWhoSpent: number;
    nonBuyerStarsSpent: number;
  };
  utilizationBuckets: Array<{ bucket: string; count: number }>;
  planStats: Array<{
    planId: string;
    purchases: number;
    starsGranted: number;
    revenueUsd: number;
    uniqueBuyers: number;
  }>;
  genBreakdown: {
    image: { count: number; stars: number; avgCost: number };
    video: { count: number; stars: number; avgCost: number };
  };
  packTheoretical: {
    sparkImages: number;
    sparkVideos480: number;
    imageCost: number;
    videoCost480: number;
  };
  buyers: Array<{
    id: string;
    email: string;
    name: string;
    purchases: number;
    purchased: number;
    spent: number;
    remaining: number;
    utilization: number;
    utilizationLabel: string;
    imageGens: number;
    videoGens: number;
    lastPaidAt: string | null;
  }>;
};

function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

function formatUsd(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-black/25 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">{label}</p>
      <p className="mt-2 text-2xl font-black tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-white/40">{hint}</p> : null}
    </div>
  );
}

function UtilBar({ rate }: { rate: number }) {
  const width = `${Math.min(100, Math.max(0, rate * 100))}%`;
  const color =
    rate >= 0.75 ? 'bg-emerald-400' : rate >= 0.4 ? 'bg-amber-400' : rate > 0 ? 'bg-rose-400' : 'bg-white/20';
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/8">
        <div className={`h-full rounded-full ${color}`} style={{ width }} />
      </div>
      <span className="w-12 text-right text-xs tabular-nums text-white/55">{pct(rate)}</span>
    </div>
  );
}

export default function AdminUsagePage() {
  const [data, setData] = useState<UsageReport | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      void fetch('/api/admin/usage')
        .then(async (res) => {
          const json = (await res.json()) as UsageReport & { message?: string };
          if (!res.ok) throw new Error(json.message || 'Could not load usage report.');
          if (!cancelled) {
            setData(json);
            setError('');
            setLoading(false);
          }
        })
        .catch((err: Error) => {
          if (!cancelled) {
            setError(err.message);
            setLoading(false);
          }
        });
    };
    load();
    const timer = window.setInterval(load, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const s = data?.summary;
  const theoretical = data?.packTheoretical;
  const avgSpentPerBuyer = s && s.payingUsers ? Math.round(s.totalStarsSpentByBuyers / s.payingUsers) : 0;
  const avgPurchasedPerBuyer = s && s.payingUsers ? Math.round(s.totalStarsSold / s.payingUsers) : 0;
  const effectiveUsdPerBuyer =
    s && s.payingUsers ? s.totalRevenueUsd / s.payingUsers : 0;
  const usedUsdPerBuyer =
    s && s.totalStarsSold > 0
      ? (s.totalStarsSpentByBuyers / s.totalStarsSold) * effectiveUsdPerBuyer
      : 0;

  return (
    <div>
      <PageHeader
        kicker="Pricing"
        title="Credit usage"
        description="How much Stars buyers actually spend vs what they purchase. Use this to right-size packs and pricing."
      />

      {error ? <p className="mb-4 text-sm text-rose-300">{error}</p> : null}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Platform utilization"
          value={s ? pct(s.platformUtilization) : '—'}
          hint="Stars spent ÷ Stars sold (paying users)"
        />
        <Stat
          label="Avg buyer usage"
          value={s ? pct(s.avgUtilizationPerBuyer) : '—'}
          hint={s ? `${avgSpentPerBuyer.toLocaleString()} of ${avgPurchasedPerBuyer.toLocaleString()} Stars used` : ''}
        />
        <Stat
          label="Unused liability"
          value={s ? s.totalStarsRemainingWithBuyers.toLocaleString('en-US') : '—'}
          hint="Stars still on buyer balances"
        />
        <Stat
          label="Revenue vs usage"
          value={s ? formatUsd(usedUsdPerBuyer) : '—'}
          hint={s ? `Avg used of ${formatUsd(effectiveUsdPerBuyer)} paid per buyer` : ''}
        />
      </div>

      {s && theoretical ? (
        <Panel className="mb-6 border-amber-400/20 bg-amber-400/[0.04]">
          <h2 className="text-base font-black sm:text-lg">Pricing signals</h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-white/70">
            <li>
              Buyers use about <strong className="text-white">{pct(s.platformUtilization)}</strong> of purchased Stars on
              average — packs are sized larger than typical consumption.
            </li>
            <li>
              A 750-Star MINI pack advertises up to {theoretical.sparkImages} images or {theoretical.sparkVideos480}{' '}
              videos, but buyers actually spend ~{avgSpentPerBuyer} Stars (~
              {Math.round(avgSpentPerBuyer / theoretical.imageCost)} images or ~
              {Math.round(avgSpentPerBuyer / theoretical.videoCost480)} videos).
            </li>
            <li>
              <strong className="text-white">{s.buyersFullyConsumed}</strong> buyers fully burned through a pack;{' '}
              <strong className="text-white">{s.buyersMostlyUnused}</strong> used less than 25%.
            </li>
            {s.repeatBuyers === 0 && s.totalPurchases > s.payingUsers ? (
              <li>No repeat buyers yet — consider a smaller entry pack or bonus on second purchase.</li>
            ) : null}
            {data.genBreakdown.video.stars > data.genBreakdown.image.stars ? (
              <li>
                Video generations consume more Stars ({data.genBreakdown.video.stars.toLocaleString()} vs{' '}
                {data.genBreakdown.image.stars.toLocaleString()} on images) — video-heavy users may need bigger packs.
              </li>
            ) : null}
          </ul>
        </Panel>
      ) : null}

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Panel>
          <h2 className="text-base font-black sm:text-lg">Utilization distribution</h2>
          <p className="mt-1 text-sm text-white/45">Paying users grouped by % of purchased Stars spent.</p>
          <div className="mt-4 space-y-3">
            {loading ? (
              <p className="text-sm text-white/40">Loading…</p>
            ) : !data?.utilizationBuckets.length ? (
              <p className="text-sm text-white/40">No paying users yet.</p>
            ) : (
              data.utilizationBuckets.map((row) => {
                const max = Math.max(...data.utilizationBuckets.map((b) => b.count), 1);
                return (
                  <div key={row.bucket}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-white/75">{row.bucket}</span>
                      <span className="tabular-nums text-white/45">{row.count} users</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/8">
                      <div
                        className="h-full rounded-full bg-[#ff2d78]"
                        style={{ width: `${(row.count / max) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Panel>

        <Panel>
          <h2 className="text-base font-black sm:text-lg">Generation spend</h2>
          <p className="mt-1 text-sm text-white/45">Stars consumed by type (all users, excl. admin).</p>
          <div className="mt-4 space-y-4">
            {data ? (
              (['image', 'video'] as const).map((mode) => {
                const row = data.genBreakdown[mode];
                const total = data.genBreakdown.image.stars + data.genBreakdown.video.stars;
                const share = total ? row.stars / total : 0;
                return (
                  <div key={mode}>
                    <div className="mb-1 flex justify-between text-sm capitalize">
                      <span className="font-medium text-white/85">{mode}s</span>
                      <span className="tabular-nums text-white/55">
                        {row.count} gens · {row.stars.toLocaleString()} Stars ({pct(share)})
                      </span>
                    </div>
                    <p className="text-xs text-white/40">Avg {row.avgCost.toFixed(1)} Stars per {mode}</p>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-white/40">Loading…</p>
            )}
          </div>
          {s ? (
            <p className="mt-4 text-xs text-white/35">
              {s.nonBuyersWhoSpent} free users spent {s.nonBuyerStarsSpent} Stars (legacy trial / promos).
            </p>
          ) : null}
        </Panel>
      </div>

      {data?.planStats.length ? (
        <Panel className="mb-6">
          <h2 className="text-base font-black sm:text-lg">Sales by plan</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="text-[11px] uppercase tracking-[0.16em] text-white/35">
                <tr className="border-b border-white/8">
                  <th className="py-3 pr-4 font-semibold">Plan</th>
                  <th className="px-4 py-3 font-semibold">Purchases</th>
                  <th className="px-4 py-3 font-semibold">Stars sold</th>
                  <th className="px-4 py-3 font-semibold">Revenue</th>
                  <th className="py-3 pl-4 font-semibold">Unique buyers</th>
                </tr>
              </thead>
              <tbody>
                {data.planStats.map((plan) => (
                  <tr key={plan.planId} className="border-t border-white/6">
                    <td className="py-3.5 pr-4 capitalize font-medium text-white">{plan.planId}</td>
                    <td className="px-4 py-3.5 tabular-nums text-white/60">{plan.purchases}</td>
                    <td className="px-4 py-3.5 tabular-nums text-white/60">{plan.starsGranted.toLocaleString()}</td>
                    <td className="px-4 py-3.5 tabular-nums text-white/60">{formatUsd(plan.revenueUsd)}</td>
                    <td className="py-3.5 pl-4 tabular-nums text-white/60">{plan.uniqueBuyers}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : null}

      <Panel>
        <h2 className="text-base font-black sm:text-lg">Paying users</h2>
        <p className="mt-1 text-sm text-white/45">
          Purchased vs spent vs remaining. Sorted by total Stars consumed.
        </p>

        <div className="mt-4 space-y-3 sm:hidden">
          {loading ? (
            <p className="text-sm text-white/40">Loading…</p>
          ) : !data?.buyers.length ? (
            <p className="text-sm text-white/40">No paying users yet.</p>
          ) : (
            data.buyers.map((buyer) => (
              <div key={buyer.id} className="rounded-xl border border-white/8 bg-black/20 p-4">
                <Link href={`/admin/users/${buyer.id}`} className="font-bold text-white hover:text-[#ff6b9d]">
                  {buyer.email}
                </Link>
                <p className="mt-2 text-sm text-white/65">
                  Bought {buyer.purchased.toLocaleString()} · Spent {buyer.spent.toLocaleString()} · Left{' '}
                  {buyer.remaining.toLocaleString()}
                </p>
                <div className="mt-2">
                  <UtilBar rate={buyer.utilization} />
                </div>
                <p className="mt-2 text-xs text-white/40">
                  {buyer.imageGens} img · {buyer.videoGens} vid
                  {buyer.purchases > 1 ? ` · ${buyer.purchases} purchases` : ''}
                </p>
              </div>
            ))
          )}
        </div>

        <div className="mt-4 hidden overflow-x-auto sm:block">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-[11px] uppercase tracking-[0.16em] text-white/35">
              <tr className="border-b border-white/8">
                <th className="py-3 pr-4 font-semibold">User</th>
                <th className="px-4 py-3 font-semibold">Purchased</th>
                <th className="px-4 py-3 font-semibold">Spent</th>
                <th className="px-4 py-3 font-semibold">Remaining</th>
                <th className="px-4 py-3 font-semibold">Usage</th>
                <th className="px-4 py-3 font-semibold">Gens</th>
                <th className="py-3 pl-4 font-semibold">Purchases</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-white/40">
                    Loading…
                  </td>
                </tr>
              ) : !data?.buyers.length ? (
                <tr>
                  <td colSpan={7} className="py-8 text-white/40">
                    No paying users yet.
                  </td>
                </tr>
              ) : (
                data.buyers.map((buyer) => (
                  <tr key={buyer.id} className="border-t border-white/6 hover:bg-white/[0.03]">
                    <td className="py-3.5 pr-4">
                      <Link href={`/admin/users/${buyer.id}`} className="font-medium text-white hover:text-[#ff6b9d]">
                        {buyer.email}
                      </Link>
                      {buyer.name ? <p className="mt-0.5 text-xs text-white/40">{buyer.name}</p> : null}
                    </td>
                    <td className="px-4 py-3.5 tabular-nums font-medium text-white">
                      {buyer.purchased.toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5 tabular-nums text-white/70">{buyer.spent.toLocaleString()}</td>
                    <td className="px-4 py-3.5 tabular-nums text-white/70">{buyer.remaining.toLocaleString()}</td>
                    <td className="px-4 py-3.5 min-w-[140px]">
                      <UtilBar rate={buyer.utilization} />
                    </td>
                    <td className="px-4 py-3.5 text-white/55">
                      {buyer.imageGens} img · {buyer.videoGens} vid
                    </td>
                    <td className="py-3.5 pl-4 tabular-nums text-white/55">{buyer.purchases}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
