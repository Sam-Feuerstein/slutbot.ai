'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import BrandLogo from '../components/BrandLogo';
import { safeNextPath } from '@/lib/site';

const TOKEN_KEY = 'token';
const CLIENT_ID_KEY = 'slutbot-user-client-id';

export function storeAuthSession(input: { token: string; clientId: string }) {
  localStorage.setItem(TOKEN_KEY, input.token);
  localStorage.setItem(CLIENT_ID_KEY, input.clientId);
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(CLIENT_ID_KEY);
}

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = safeNextPath(searchParams.get('redirect'));

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const oauthError = searchParams.get('error');
    if (oauthError) {
      setError(oauthError);
    }
  }, [searchParams]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as {
        token?: string;
        clientId?: string;
        desires?: number;
        message?: string;
      };
      if (!res.ok || !data.token || !data.clientId) {
        setError(data.message || 'Could not sign in.');
        return;
      }
      storeAuthSession({ token: data.token, clientId: data.clientId });
      localStorage.setItem('slutbot-desires', String(data.desires ?? 0));
      localStorage.setItem('slutbot-desires-server', String(data.desires ?? 0));
      window.dispatchEvent(new CustomEvent('slutbot:desires-updated'));
      router.push(redirect);
    } catch {
      setError('Could not sign in.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#090505] px-4 py-[max(1.5rem,var(--safe-top))] text-white">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#141414] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
        <BrandLogo className="mb-5 h-8 w-auto" />
        <h1 className="text-2xl font-black">Sign in</h1>
        <p className="mt-2 text-sm text-white/55">Use your email and password to access your account.</p>

        <form className="mt-6 space-y-3" onSubmit={onSubmit}>
          <label className="block text-xs font-semibold uppercase tracking-wider text-white/45">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-2xl border border-white/10 bg-black/50 px-3.5 py-3 text-base outline-none focus:border-[#ff2d78]/70"
              autoComplete="email"
              required
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wider text-white/45">
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full rounded-2xl border border-white/10 bg-black/50 px-3.5 py-3 text-base outline-none focus:border-[#ff2d78]/70"
              autoComplete="current-password"
              required
            />
          </label>
          {error ? <p className="text-sm text-[#ffb0c8]">{error}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-12 rounded-full bg-[#ff2d78] py-3 text-sm font-bold text-white hover:bg-[#ff1a6b] disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign in with email'}
          </button>
        </form>

        <div className="mt-6 space-y-2 border-t border-white/10 pt-5">
          <Link
            href={`/api/auth/google?redirect=${encodeURIComponent(redirect)}`}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-white py-3 text-sm font-bold text-[#141414] hover:bg-white/90"
          >
            <span aria-hidden>G</span>
            Continue with Google
          </Link>
          <button type="button" disabled className="w-full rounded-full border border-white/10 py-3 text-sm font-bold text-white/35">
            Continue with Telegram (later)
          </button>
        </div>
      </div>
    </div>
  );
}
