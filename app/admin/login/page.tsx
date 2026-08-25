'use client';

import { FormEvent, Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function AdminLoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) {
        setError(data.message || 'Login failed.');
        return;
      }
      router.replace(search.get('next') || '/admin');
      router.refresh();
    } catch {
      setError('Login failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center">
      <form onSubmit={onSubmit} className="w-full rounded-[28px] border border-white/10 bg-white/[0.04] p-6 sm:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ff6b9d]">Admin</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Sign in</h1>
        <p className="mt-2 text-sm text-white/50">Use your admin login and password.</p>
        <label className="mt-6 block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-white/45">Login</span>
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            className="w-full rounded-2xl border border-white/10 bg-black/50 px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#ff2d78]/70"
            required
          />
        </label>
        <label className="mt-4 block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-white/45">Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            className="w-full rounded-2xl border border-white/10 bg-black/50 px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#ff2d78]/70"
            required
          />
        </label>
        {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
        <button
          type="submit"
          disabled={busy}
          className="mt-6 w-full rounded-full bg-[#ff2d78] px-6 py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          {busy ? 'Signing in…' : 'Enter'}
        </button>
      </form>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense>
      <AdminLoginForm />
    </Suspense>
  );
}
