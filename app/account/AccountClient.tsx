'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import SiteHeader from '../components/SiteHeader';
import { cacheUserProfile } from '@/lib/auth/profile';
import { clearAuthSession, isSignedIn, signOutClient } from '@/lib/auth/session';
import { CURRENCY_NAME, DESIRES_UPDATED_EVENT, setDesires } from '@/lib/desires';
import { GENERATOR_PATH, loginHref } from '@/lib/site';

type Purchase = {
  id: string;
  planId: string;
  planLabel: string;
  provider: string;
  providerLabel: string;
  usdAmount: number;
  desires: number;
  createdAt: string;
};

type AccountData = {
  email: string;
  name: string;
  desires: number;
  clientId: string;
  avatarUrl?: string;
  hasPassword: boolean;
  googleLinked: boolean;
  imageGens: number;
  videoGens: number;
  joinedAt: string;
  purchases: Purchase[];
};

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function authFetch(input: RequestInfo | URL, init?: RequestInit) {
  return fetch(input, { ...init, credentials: 'include' });
}

export default function AccountClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<AccountData | null>(null);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileNote, setProfileNote] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordNote, setPasswordNote] = useState('');

  const [couponCode, setCouponCode] = useState('');
  const [couponSaving, setCouponSaving] = useState(false);
  const [couponNote, setCouponNote] = useState('');

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);

  const loadAccount = useCallback(async () => {
    if (!isSignedIn()) {
      router.replace(loginHref('/account'));
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await authFetch('/api/account');
      const data = (await res.json()) as AccountData & { message?: string };
      if (!res.ok) {
        if (res.status === 401) {
          clearAuthSession();
          router.replace(loginHref('/account'));
          return;
        }
        setError(data.message || 'Could not load account.');
        setAccount(null);
        return;
      }
      setAccount(data);
      setName(data.name);
      setDesires(data.desires);
      cacheUserProfile({ email: data.email, name: data.name, avatarUrl: data.avatarUrl });
      window.dispatchEvent(new CustomEvent(DESIRES_UPDATED_EVENT));
    } catch {
      setError('Could not load account.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadAccount();
  }, [loadAccount]);

  async function redeemCoupon(event: React.FormEvent) {
    event.preventDefault();
    setCouponSaving(true);
    setCouponNote('');
    try {
      const res = await authFetch('/api/coupons/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode }),
      });
      const data = (await res.json()) as {
        message?: string;
        desires?: number;
        creditsGranted?: number;
      };
      if (!res.ok) {
        setCouponNote(data.message || 'Could not redeem coupon.');
        return;
      }
      if (typeof data.desires === 'number') {
        setDesires(data.desires);
        setAccount((current) => (current ? { ...current, desires: data.desires as number } : current));
        window.dispatchEvent(new CustomEvent(DESIRES_UPDATED_EVENT));
      }
      setCouponCode('');
      setCouponNote(data.message || 'Coupon redeemed.');
    } catch {
      setCouponNote('Could not redeem coupon.');
    } finally {
      setCouponSaving(false);
    }
  }

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    setProfileSaving(true);
    setProfileNote('');
    try {
      const res = await authFetch('/api/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = (await res.json()) as { message?: string; name?: string };
      if (!res.ok) {
        setProfileNote(data.message || 'Could not save profile.');
        return;
      }
      setProfileNote('Profile updated.');
      setAccount((current) => {
        if (!current) return current;
        const next = { ...current, name: data.name || name.trim() };
        cacheUserProfile({ email: next.email, name: next.name, avatarUrl: next.avatarUrl });
        return next;
      });
    } catch {
      setProfileNote('Could not save profile.');
    } finally {
      setProfileSaving(false);
    }
  }

  async function changePassword(event: React.FormEvent) {
    event.preventDefault();
    setPasswordSaving(true);
    setPasswordNote('');
    try {
      const res = await authFetch('/api/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) {
        setPasswordNote(data.message || 'Could not change password.');
        return;
      }
      setCurrentPassword('');
      setNewPassword('');
      setPasswordNote('Password updated.');
    } catch {
      setPasswordNote('Could not change password.');
    } finally {
      setPasswordSaving(false);
    }
  }

  async function signOut() {
    await signOutClient();
    router.push('/');
  }

  async function deleteAccount() {
    if (deleteConfirm !== 'DELETE') return;
    setDeleting(true);
    try {
      const res = await authFetch('/api/account', { method: 'DELETE' });
      if (!res.ok) {
        const data = (await res.json()) as { message?: string };
        setError(data.message || 'Could not delete account.');
        setDeleting(false);
        return;
      }
      signOutClient();
      router.replace('/');
    } catch {
      setError('Could not delete account.');
      setDeleting(false);
    }
  }

  return (
    <div className="w-full text-white">
      <SiteHeader />
      <div className="mx-auto w-full max-w-3xl px-3 py-6 pb-[max(1.5rem,var(--safe-bottom))] sm:px-4 sm:py-10">
        <div className="mb-8">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#ff2d78]">Account</p>
          <h1 className="text-2xl font-black tracking-tight sm:text-4xl">Your profile</h1>
          <p className="mt-2 text-sm text-white/55">Balance, purchases, and account settings.</p>
        </div>

        {loading ? (
          <p className="text-sm text-white/60">Loading account…</p>
        ) : error && !account ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5">
            <p className="text-sm text-red-300">{error}</p>
            <button
              type="button"
              onClick={() => void loadAccount()}
              className="mt-3 text-sm font-semibold text-[#ff2d78] hover:underline"
            >
              Try again
            </button>
          </div>
        ) : account ? (
          <div className="space-y-6">
            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
              <h2 className="text-lg font-bold">Stars balance</h2>
              <p className="mt-2 text-3xl font-black tabular-nums text-[#ff2d78]">
                {account.desires.toLocaleString('en-US')}
                <span className="ml-2 text-base font-semibold text-white/55">{CURRENCY_NAME}</span>
              </p>
              <p className="mt-3 text-sm text-white/55">
                Server balance for your account. Purchases credit this wallet automatically after payment
                confirms.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href="/checkout?plan=flirt"
                  className="inline-flex min-h-11 items-center rounded-full bg-[#ff2d78] px-5 text-sm font-bold text-white hover:bg-[#ff1a6b]"
                >
                  Buy Stars
                </Link>
                <Link
                  href={GENERATOR_PATH}
                  className="inline-flex min-h-11 items-center rounded-full border border-white/15 px-5 text-sm font-bold text-white hover:bg-white/10"
                >
                  Generate
                </Link>
              </div>
              <dl className="mt-5 grid gap-3 border-t border-white/10 pt-5 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-white/45">Images generated</dt>
                  <dd className="font-semibold tabular-nums">{account.imageGens}</dd>
                </div>
                <div>
                  <dt className="text-white/45">Videos generated</dt>
                  <dd className="font-semibold tabular-nums">{account.videoGens}</dd>
                </div>
                <div>
                  <dt className="text-white/45">Member since</dt>
                  <dd className="font-semibold">{account.joinedAt ? formatWhen(account.joinedAt) : '—'}</dd>
                </div>
                <div>
                  <dt className="text-white/45">Sign-in</dt>
                  <dd className="font-semibold">
                    {account.googleLinked && account.hasPassword
                      ? 'Google + email'
                      : account.googleLinked
                        ? 'Google'
                        : 'Email & password'}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
              <h2 className="text-lg font-bold">Redeem coupon</h2>
              <p className="mt-2 text-sm text-white/55">
                Have a promo code? Apply it on checkout for % or $ off. Free Stars codes still redeem here.
              </p>
              <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={(event) => void redeemCoupon(event)}>
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="LAUNCH50"
                  autoComplete="off"
                  className="min-h-11 w-full rounded-2xl border border-white/10 bg-black/50 px-3.5 py-3 text-sm outline-none focus:border-[#ff2d78]/70 sm:flex-1"
                />
                <button
                  type="submit"
                  disabled={couponSaving || !couponCode.trim()}
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#ff2d78] px-5 text-sm font-bold text-white hover:bg-[#ff1a6b] disabled:opacity-50"
                >
                  {couponSaving ? 'Redeeming…' : 'Redeem'}
                </button>
              </form>
              {couponNote ? <p className="mt-3 text-sm text-[#ffb0c8]">{couponNote}</p> : null}
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
              <h2 className="text-lg font-bold">Profile</h2>
              <form className="mt-4 space-y-3" onSubmit={saveProfile}>
                <label className="block text-xs font-semibold uppercase tracking-wider text-white/45">
                  Email
                  <input
                    type="email"
                    value={account.email}
                    readOnly
                    className="mt-1.5 w-full rounded-2xl border border-white/10 bg-black/40 px-3.5 py-3 text-base text-white/70"
                  />
                </label>
                <label className="block text-xs font-semibold uppercase tracking-wider text-white/45">
                  Display name
                  <input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    maxLength={80}
                    className="mt-1.5 w-full rounded-2xl border border-white/10 bg-black/50 px-3.5 py-3 text-base outline-none focus:border-[#ff2d78]/70"
                  />
                </label>
                {profileNote ? <p className="text-sm text-white/70">{profileNote}</p> : null}
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="min-h-11 rounded-full bg-white/10 px-5 text-sm font-bold text-white hover:bg-white/15 disabled:opacity-50"
                >
                  {profileSaving ? 'Saving…' : 'Save profile'}
                </button>
              </form>
            </section>

            {account.hasPassword ? (
              <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
                <h2 className="text-lg font-bold">Change password</h2>
                <p className="mt-1 text-sm text-white/55">
                  Update your email sign-in password. Forgot it? Contact support — automated reset is not
                  available yet.
                </p>
                <form className="mt-4 space-y-3" onSubmit={changePassword}>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-white/45">
                    Current password
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(event) => setCurrentPassword(event.target.value)}
                      autoComplete="current-password"
                      className="mt-1.5 w-full rounded-2xl border border-white/10 bg-black/50 px-3.5 py-3 text-base outline-none focus:border-[#ff2d78]/70"
                      required
                    />
                  </label>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-white/45">
                    New password
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      autoComplete="new-password"
                      minLength={6}
                      className="mt-1.5 w-full rounded-2xl border border-white/10 bg-black/50 px-3.5 py-3 text-base outline-none focus:border-[#ff2d78]/70"
                      required
                    />
                  </label>
                  {passwordNote ? <p className="text-sm text-white/70">{passwordNote}</p> : null}
                  <button
                    type="submit"
                    disabled={passwordSaving}
                    className="min-h-11 rounded-full bg-white/10 px-5 text-sm font-bold text-white hover:bg-white/15 disabled:opacity-50"
                  >
                    {passwordSaving ? 'Updating…' : 'Update password'}
                  </button>
                </form>
              </section>
            ) : (
              <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
                <h2 className="text-lg font-bold">Password</h2>
                <p className="mt-2 text-sm text-white/55">
                  This account signs in with Google. Password management is handled by Google.
                </p>
              </section>
            )}

            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
              <h2 className="text-lg font-bold">Purchase history</h2>
              {account.purchases.length === 0 ? (
                <p className="mt-3 text-sm text-white/55">No completed purchases yet.</p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-white/45">
                        <th className="pb-2 pr-3 font-semibold">Date</th>
                        <th className="pb-2 pr-3 font-semibold">Plan</th>
                        <th className="pb-2 pr-3 font-semibold">Method</th>
                        <th className="pb-2 pr-3 font-semibold">Stars</th>
                        <th className="pb-2 font-semibold">USD</th>
                      </tr>
                    </thead>
                    <tbody>
                      {account.purchases.map((purchase) => (
                        <tr key={purchase.id} className="border-b border-white/5 text-white/85">
                          <td className="py-3 pr-3 whitespace-nowrap">{formatWhen(purchase.createdAt)}</td>
                          <td className="py-3 pr-3">{purchase.planLabel}</td>
                          <td className="py-3 pr-3">{purchase.providerLabel}</td>
                          <td className="py-3 pr-3 tabular-nums">+{purchase.desires.toLocaleString('en-US')}</td>
                          <td className="py-3 tabular-nums">${purchase.usdAmount.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
              <h2 className="text-lg font-bold">Session</h2>
              <p className="mt-2 text-sm text-white/55">
                Sign out to switch accounts on this device. Your Stars stay on your account.
              </p>
              <button
                type="button"
                onClick={() => void signOut()}
                className="mt-4 min-h-11 rounded-full border border-white/15 px-5 text-sm font-bold text-white hover:bg-white/10"
              >
                Sign out
              </button>
            </section>

            <section className="rounded-2xl border border-red-500/25 bg-red-500/[0.06] p-5 sm:p-6">
              <h2 className="text-lg font-bold text-red-200">Delete account</h2>
              <p className="mt-2 text-sm text-white/55">
                Permanently delete your account and sign-in access. Purchase records may be retained for
                compliance. This cannot be undone.
              </p>
              {!deleteOpen ? (
                <button
                  type="button"
                  onClick={() => setDeleteOpen(true)}
                  className="mt-4 min-h-11 rounded-full border border-red-400/40 px-5 text-sm font-bold text-red-200 hover:bg-red-500/10"
                >
                  Delete my account
                </button>
              ) : (
                <div className="mt-4 space-y-3">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-white/45">
                    Type DELETE to confirm
                    <input
                      type="text"
                      value={deleteConfirm}
                      onChange={(event) => setDeleteConfirm(event.target.value)}
                      className="mt-1.5 w-full rounded-2xl border border-red-400/30 bg-black/50 px-3.5 py-3 text-base outline-none focus:border-red-400/60"
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={deleteConfirm !== 'DELETE' || deleting}
                      onClick={() => void deleteAccount()}
                      className="min-h-11 rounded-full bg-red-600 px-5 text-sm font-bold text-white hover:bg-red-500 disabled:opacity-50"
                    >
                      {deleting ? 'Deleting…' : 'Confirm delete'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteOpen(false);
                        setDeleteConfirm('');
                      }}
                      className="min-h-11 rounded-full border border-white/15 px-5 text-sm font-bold text-white hover:bg-white/10"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}
