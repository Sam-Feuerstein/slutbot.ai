'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { SITE_DOMAIN } from '@/lib/site';
import { signOutClient, storeAuthSession } from '@/lib/auth/session';
import { cacheUserProfile } from '@/lib/auth/profile';
import { setDesires } from '@/lib/desires';
import BrandLogo from '../../components/BrandLogo';

const NAV = [
  {
    label: 'Workspace',
    items: [
      { href: '/admin', label: 'Overview', match: 'exact' as const },
      { href: '/admin/analytics', label: 'Analytics', match: 'exact' as const },
      { href: '/admin/app', label: 'App installs', match: 'exact' as const },
      { href: '/admin/users', label: 'Users', match: 'prefix' as const },
      { href: '/admin/wallet', label: 'Stars cost', match: 'exact' as const },
      { href: '/admin/coupons', label: 'Coupons', match: 'exact' as const },
      { href: '/admin/prompts', label: 'Prompts & models', match: 'exact' as const },
      { href: '/admin/samples', label: 'Sample gallery', match: 'exact' as const },
    ],
  },
  {
    label: 'Payments',
    items: [
      { href: '/admin/payments/nowpayments', label: 'NOWPayments', match: 'exact' as const },
      { href: '/admin/payments/telegram', label: 'Telegram Stars', match: 'exact' as const },
      { href: '/admin/payments/stars-geo', label: 'Stars by country', match: 'exact' as const },
    ],
  },
  {
    label: 'Messaging',
    items: [{ href: '/admin/emails', label: 'Email', match: 'exact' as const }],
  },
];

function isActive(pathname: string, href: string, match: 'exact' | 'prefix') {
  if (match === 'exact') return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function currentLabel(pathname: string) {
  for (const group of NAV) {
    for (const item of group.items) {
      if (isActive(pathname, item.href, item.match)) return item.label;
    }
  }
  return 'Admin';
}

async function syncAdminSiteSession() {
  try {
    const res = await fetch('/api/admin/bootstrap-user', { credentials: 'same-origin' });
    if (!res.ok) return;
    const data = (await res.json()) as {
      clientId?: string;
      email?: string;
      name?: string;
      desires?: number;
    };
    if (!data.clientId) return;
    storeAuthSession({ clientId: data.clientId });
    cacheUserProfile({
      email: data.email || '',
      name: data.name || 'Admin',
      avatarUrl: '',
    });
    if (typeof data.desires === 'number') setDesires(data.desires);
  } catch {
    /* site session sync is best-effort */
  }
}

function NavLinks({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex-1 space-y-6 overflow-y-auto">
      {NAV.map((group) => (
        <div key={group.label}>
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">{group.label}</p>
          <div className="space-y-1">
            {group.items.map((item) => {
              const active = isActive(pathname, item.href, item.match);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={`block min-h-11 rounded-2xl px-3 py-2.5 text-sm font-semibold transition ${
                    active
                      ? 'bg-[#ff2d78] text-white shadow-[0_8px_24px_rgba(255,45,120,0.28)]'
                      : 'text-white/55 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const login = pathname === '/admin/login';
  const [authorized, setAuthorized] = useState(login);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  useEffect(() => {
    if (login) {
      setAuthorized(true);
      return;
    }

    let cancelled = false;
    setAuthorized(false);
    void fetch('/api/admin/me', { credentials: 'same-origin' })
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) {
          const next = encodeURIComponent(pathname || '/admin');
          router.replace(`/admin/login?next=${next}`);
          return;
        }
        setAuthorized(true);
        await syncAdminSiteSession();
      })
      .catch(() => {
        if (!cancelled) {
          const next = encodeURIComponent(pathname || '/admin');
          router.replace(`/admin/login?next=${next}`);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [login, pathname, router]);

  async function logout() {
    setMenuOpen(false);
    await signOutClient();
    try {
      await fetch('/api/admin/logout', { method: 'POST', credentials: 'same-origin' });
    } catch {
      /* signOutClient already wiped cookies via /api/auth/logout */
    }
    window.location.href = '/admin/login';
  }

  if (login) {
    return <div className="min-h-screen bg-[#070406] text-white">{children}</div>;
  }

  if (!authorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070406] px-4 text-sm text-white/50">
        Checking admin session…
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#070406] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(900px_420px_at_0%_0%,rgba(255,45,120,0.16),transparent_55%),radial-gradient(700px_280px_at_100%_0%,rgba(120,40,80,0.12),transparent_50%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-[1440px]">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-white/8 bg-black/40 px-4 py-6 backdrop-blur-xl lg:flex">
          <div className="relative px-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/35">{SITE_DOMAIN}</p>
            <div className="relative mt-1">
              <div
                aria-hidden
                className="pointer-events-none absolute -left-6 -top-7 h-24 w-40 bg-[radial-gradient(closest-side,rgba(255,45,120,0.18),transparent)]"
              />
              <BrandLogo className="text-[1.75rem]" />
            </div>
            <p className="mt-1 text-xs text-white/40">Admin</p>
          </div>
          <div className="mt-8 flex min-h-0 flex-1 flex-col">
            <NavLinks pathname={pathname} />
          </div>
          <button type="button" onClick={() => void logout()} className="rounded-2xl px-3 py-2 text-left text-sm text-white/35 hover:text-white">
            Log out
          </button>
          <Link href="/" className="rounded-2xl px-3 py-2 text-sm text-white/35 hover:text-white">
            ← Back to site
          </Link>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-white/8 bg-[#070406]/90 pt-[var(--safe-top)] backdrop-blur-xl lg:hidden">
            <div className="flex min-h-12 items-center gap-2 px-3 py-2">
              <button
                type="button"
                aria-label="Open admin menu"
                onClick={() => setMenuOpen(true)}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-white"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0 flex-1">
                <BrandLogo className="text-[1.35rem]" />
                <p className="truncate text-[11px] font-semibold text-white/45">{currentLabel(pathname)}</p>
              </div>
              <Link
                href="/"
                className="inline-flex h-11 shrink-0 items-center rounded-full px-3 text-xs font-bold text-white/60"
              >
                Site
              </Link>
            </div>
          </header>

          {menuOpen ? (
            <div className="fixed inset-0 z-40 lg:hidden">
              <button
                type="button"
                aria-label="Close admin menu"
                className="absolute inset-0 bg-black/70"
                onClick={() => setMenuOpen(false)}
              />
              <aside className="absolute left-0 top-0 flex h-full w-[min(86vw,300px)] flex-col border-r border-[#ff2d78]/25 bg-[#14080e] px-3 pb-[max(1rem,var(--safe-bottom))] pt-[max(0.75rem,var(--safe-top))] shadow-2xl">
                <div className="mb-4 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <BrandLogo className="text-[1.4rem]" />
                    <p className="text-[11px] text-white/40">Admin</p>
                  </div>
                  <button
                    type="button"
                    aria-label="Close admin menu"
                    onClick={() => setMenuOpen(false)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <NavLinks pathname={pathname} onNavigate={() => setMenuOpen(false)} />
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="mt-3 min-h-11 rounded-2xl px-3 py-2 text-left text-sm font-semibold text-white/55"
                >
                  Log out
                </button>
                <Link
                  href="/"
                  onClick={() => setMenuOpen(false)}
                  className="min-h-11 rounded-2xl px-3 py-2 text-sm font-semibold text-white/55"
                >
                  ← Back to site
                </Link>
              </aside>
            </div>
          ) : null}

          <main className="min-w-0 px-3 py-5 pb-[max(1.5rem,var(--safe-bottom))] sm:px-6 sm:py-8 lg:px-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
