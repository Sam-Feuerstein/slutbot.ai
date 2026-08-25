'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SITE_DOMAIN } from '@/lib/site';
import BrandLogo from '../../components/BrandLogo';

const NAV = [
  {
    label: 'Workspace',
    items: [
      { href: '/admin', label: 'Overview', match: 'exact' as const },
      { href: '/admin/analytics', label: 'Analytics', match: 'exact' as const },
      { href: '/admin/users', label: 'Users', match: 'prefix' as const },
      { href: '/admin/wallet', label: 'Slutcoin cost', match: 'exact' as const },
      { href: '/admin/prompts', label: 'Prompts', match: 'exact' as const },
    ],
  },
  {
    label: 'Payments',
    items: [
      { href: '/admin/payments/nowpayments', label: 'NOWPayments', match: 'exact' as const },
      { href: '/admin/payments/telegram', label: 'Telegram Stars', match: 'exact' as const },
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

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const login = pathname === '/admin/login';

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    window.location.href = '/admin/login';
  }

  if (login) {
    return <div className="min-h-screen bg-[#070406] text-white">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-[#070406] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(900px_420px_at_0%_0%,rgba(255,45,120,0.16),transparent_55%),radial-gradient(700px_280px_at_100%_0%,rgba(120,40,80,0.12),transparent_50%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-[1440px]">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-white/8 bg-black/40 px-4 py-6 backdrop-blur-xl lg:flex">
          <div className="px-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/35">{SITE_DOMAIN}</p>
            <BrandLogo className="mt-2 h-7 w-auto" />
            <p className="text-xs text-white/40">Admin</p>
          </div>
          <nav className="mt-8 flex-1 space-y-6 overflow-y-auto">
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
                        className={`block rounded-2xl px-3 py-2 text-sm font-semibold transition ${
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
          <button type="button" onClick={() => void logout()} className="rounded-2xl px-3 py-2 text-left text-sm text-white/35 hover:text-white">
            Log out
          </button>
          <Link href="/" className="rounded-2xl px-3 py-2 text-sm text-white/35 hover:text-white">
            ← Back to site
          </Link>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-white/8 bg-[#070406]/80 px-4 py-3 backdrop-blur-xl lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <BrandLogo className="h-6 w-auto" />
              <Link href="/" className="text-xs text-white/50">
                Site
              </Link>
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {NAV.flatMap((g) => g.items).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${
                    isActive(pathname, item.href, item.match) ? 'bg-[#ff2d78] text-white' : 'bg-white/8 text-white/60'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </header>
          <main className="px-4 py-8 sm:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
