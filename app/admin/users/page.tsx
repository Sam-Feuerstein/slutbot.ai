'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { adminHeaders, getAdminPassword, setAdminPassword } from '@/lib/adminApi';
import { PageHeader, Panel, SaveButton, inputClass } from '../components/AdminUi';

type AdminUser = {
  id: string;
  email: string;
  name: string;
  desires: number;
  banned: boolean;
  imageGens: number;
  videoGens: number;
  joinedAt: string;
};

export default function AdminUsersPage() {
  const [q, setQ] = useState('');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', name: '', desires: '50' });
  const [adminPw, setAdminPw] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/users?q=${encodeURIComponent(q)}`, { headers: adminHeaders() });
      const data = (await res.json()) as { users?: AdminUser[]; message?: string };
      if (!res.ok) {
        setError(data.message || 'Could not load users.');
        setUsers([]);
        return;
      }
      setUsers(data.users || []);
    } catch {
      setError('Could not load users.');
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => {
    setAdminPw(getAdminPassword());
    void load();
  }, [load]);

  async function saveAdminPassword() {
    setAdminPassword(adminPw);
    await load();
  }

  async function createUser(event: React.FormEvent) {
    event.preventDefault();
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: adminHeaders(),
      body: JSON.stringify({
        email: form.email,
        password: form.password,
        name: form.name,
        desires: Number(form.desires),
      }),
    });
    const data = (await res.json()) as { message?: string };
    if (!res.ok) {
      setError(data.message || 'Could not create user.');
      return;
    }
    setShowCreate(false);
    setForm({ email: '', password: '', name: '', desires: '50' });
    await load();
  }

  return (
    <div>
      <PageHeader
        kicker="Accounts"
        title="Users"
        description="Create test accounts, set passwords, and allocate Slutcoins."
        action={
          <div className="flex flex-wrap gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search email, name"
              className={`${inputClass} w-56`}
            />
            <button
              type="button"
              onClick={() => setShowCreate((v) => !v)}
              className="rounded-full bg-[#ff2d78] px-5 py-2.5 text-sm font-bold text-white"
            >
              {showCreate ? 'Close' : 'Add user'}
            </button>
          </div>
        }
      />

      {!getAdminPassword() ? (
        <Panel className="mb-5">
          <p className="text-sm text-white/50">Enter admin password once (from .env.local ADMIN_PASSWORD).</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              type="password"
              value={adminPw}
              onChange={(e) => setAdminPw(e.target.value)}
              placeholder="Admin password"
              className={`${inputClass} max-w-xs`}
            />
            <button type="button" onClick={saveAdminPassword} className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-black">
              Save
            </button>
          </div>
        </Panel>
      ) : null}

      {showCreate ? (
        <Panel className="mb-5">
          <h2 className="text-lg font-black">New user</h2>
          <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={createUser}>
            <input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="Email" className={inputClass} required />
            <input value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="Password (6+)" type="password" className={inputClass} required />
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Display name" className={inputClass} />
            <input value={form.desires} onChange={(e) => setForm((f) => ({ ...f, desires: e.target.value }))} placeholder="Starting Slutcoins" type="number" className={inputClass} />
            <div className="md:col-span-2">
              <SaveButton>Create user</SaveButton>
            </div>
          </form>
        </Panel>
      ) : null}

      {error ? <p className="mb-4 text-sm text-[#ffb0c8]">{error}</p> : null}

      <Panel className="overflow-hidden !p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="text-[11px] uppercase tracking-[0.16em] text-white/35">
              <tr className="border-b border-white/8">
                <th className="px-5 py-4 font-semibold">User</th>
                <th className="px-5 py-4 font-semibold">Joined</th>
                <th className="px-5 py-4 font-semibold">Slutcoins</th>
                <th className="px-5 py-4 font-semibold">Gens</th>
                <th className="px-5 py-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-white/40">
                    Loading…
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-white/40">
                    No users yet.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="border-t border-white/6 transition hover:bg-white/[0.03]">
                    <td className="px-5 py-4">
                      <Link href={`/admin/users/${user.id}`} className="font-bold text-white hover:text-[#ff6b9d]">
                        {user.email}
                      </Link>
                      {user.name ? <p className="mt-0.5 text-xs text-white/40">{user.name}</p> : null}
                    </td>
                    <td className="px-5 py-4 text-white/60">{user.joinedAt.slice(0, 10)}</td>
                    <td className="px-5 py-4 text-lg font-black">{user.desires}</td>
                    <td className="px-5 py-4 text-white/60">
                      {user.imageGens} img · {user.videoGens} vid
                    </td>
                    <td className="px-5 py-4">
                      {user.banned ? (
                        <span className="rounded-full bg-red-500/15 px-2.5 py-1 text-[11px] font-bold text-red-300">Banned</span>
                      ) : (
                        <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-[11px] font-bold text-emerald-300">Active</span>
                      )}
                    </td>
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
