'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { adminHeaders } from '@/lib/adminApi';
import { Field, PageHeader, Panel, inputClass } from '../../components/AdminUi';

type UserDetail = {
  id: string;
  email: string;
  name: string;
  clientId: string;
  desires: number;
  banned: boolean;
  imageGens: number;
  videoGens: number;
  joinedAt: string;
  lastLoginAt: string;
  signIn?: string;
  telegramUsername?: string;
};

type Purchase = {
  id: string;
  planId: string;
  provider: string;
  usdAmount: number;
  starsAmount: number;
  desires: number;
  createdAt: string;
};

export default function AdminUserPage() {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [desires, setDesires] = useState('');
  const [adjust, setAdjust] = useState('');
  const [flash, setFlash] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    const res = await fetch(`/api/admin/users/${id}`, { headers: adminHeaders() });
    const data = (await res.json()) as { user?: UserDetail; purchases?: Purchase[]; message?: string };
    if (!res.ok || !data.user) {
      setError(data.message || 'User not found.');
      setUser(null);
      return;
    }
    setUser(data.user);
    setPurchases(data.purchases || []);
    setEmail(data.user.email);
    setName(data.user.name);
    setDesires(String(data.user.desires));
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function patch(body: Record<string, unknown>) {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: adminHeaders(),
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as { user?: UserDetail; message?: string };
    if (!res.ok || !data.user) {
      setFlash(data.message || 'Update failed.');
      return;
    }
    setUser(data.user);
    setDesires(String(data.user.desires));
    setFlash('Saved.');
    setPassword('');
    setAdjust('');
    await load();
  }

  if (error) {
    return (
      <p className="text-sm text-white/50">
        {error}{' '}
        <Link href="/admin/users" className="text-[#ff2d78]">
          Back
        </Link>
      </p>
    );
  }

  if (!user) {
    return <p className="text-sm text-white/50">Loading…</p>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Account"
        title={user.name || user.email}
        description={`${user.email} · client ${user.clientId.slice(0, 8)}…`}
        action={
          <button
            type="button"
            onClick={() => patch({ banned: !user.banned })}
            className={`rounded-full px-5 py-2.5 text-sm font-bold ${user.banned ? 'bg-white/10 text-white' : 'bg-red-600 text-white'}`}
          >
            {user.banned ? 'Unban' : 'Ban user'}
          </button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: 'Stars', value: String(user.desires) },
          { label: 'Image gens', value: String(user.imageGens) },
          { label: 'Video gens', value: String(user.videoGens) },
          { label: 'Purchases', value: String(purchases.length) },
        ].map((item) => (
          <Panel key={item.label} className="!p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">{item.label}</p>
            <p className="mt-2 text-3xl font-black">{item.value}</p>
          </Panel>
        ))}
      </div>

      <Panel>
        <h2 className="text-lg font-black">Account</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Field label="Sign-in">
            <input
              value={
                user.telegramUsername ? `${user.signIn || 'Telegram'} (@${user.telegramUsername})` : user.signIn || '—'
              }
              readOnly
              className={inputClass}
            />
          </Field>
          <Field label="Email">
            <input value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Display name">
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          </Field>
          <Field label="New password" hint="Leave blank to keep current.">
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" className={inputClass} />
          </Field>
          <Field label="Set Stars balance">
            <input value={desires} onChange={(e) => setDesires(e.target.value)} type="number" className={inputClass} />
          </Field>
        </div>
        <button
          type="button"
          onClick={() => patch({ email, name, password: password || undefined, desires: Number(desires) })}
          className="mt-4 rounded-full bg-[#ff2d78] px-5 py-2.5 text-sm font-bold"
        >
          Save account
        </button>
      </Panel>

      <Panel>
        <h2 className="text-lg font-black">Add / revoke Stars</h2>
        <form
          className="mt-4 flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const n = Math.round(Number(adjust));
            if (!n) return;
            void patch({ adjustDesires: n });
          }}
        >
          <input value={adjust} onChange={(e) => setAdjust(e.target.value)} type="number" placeholder="50 or -50" className={`${inputClass} w-40`} />
          <button className="rounded-2xl bg-white px-5 py-2.5 text-sm font-bold text-black">Apply</button>
        </form>
        {flash ? <p className="mt-3 text-sm text-[#ffb0c8]">{flash}</p> : null}
      </Panel>

      <Panel className="overflow-hidden !p-0">
        <div className="border-b border-white/8 px-5 py-4">
          <h2 className="text-lg font-black">Purchases</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-[11px] uppercase tracking-[0.16em] text-white/35">
              <tr>
                <th className="px-5 py-3 font-semibold">When</th>
                <th className="px-5 py-3 font-semibold">Plan</th>
                <th className="px-5 py-3 font-semibold">Provider</th>
                <th className="px-5 py-3 font-semibold">Amount</th>
                <th className="px-5 py-3 font-semibold">Stars</th>
              </tr>
            </thead>
            <tbody>
              {purchases.length === 0 ? (
                <tr>
                  <td className="px-5 py-6 text-white/40" colSpan={5}>
                    No purchases yet.
                  </td>
                </tr>
              ) : (
                purchases.map((p) => (
                  <tr key={p.id} className="border-t border-white/6">
                    <td className="px-5 py-3 text-white/65">{p.createdAt.replace('T', ' ').slice(0, 16)}</td>
                    <td className="px-5 py-3 font-semibold">{p.planId}</td>
                    <td className="px-5 py-3">{p.provider === 'telegram_stars' ? 'Telegram Stars' : 'NOWPayments'}</td>
                    <td className="px-5 py-3">
                      ${p.usdAmount}
                      {p.starsAmount ? ` / ${p.starsAmount}⭐` : ''}
                    </td>
                    <td className="px-5 py-3">{p.desires}</td>
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
