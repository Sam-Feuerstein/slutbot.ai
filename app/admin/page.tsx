'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { MOCK_ADMIN_USERS } from '@/lib/adminMock';
import { loadAdminSettings } from '@/lib/adminSettings';
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
    href: '/admin/users',
    title: 'Users',
    copy: 'Accounts, bans, and Slutcoin tweaks.',
    key: 'users' as const,
  },
  {
    href: '/admin/prompts',
    title: 'Prompts',
    copy: 'Hidden nude prompts used on every image and video generation.',
    key: 'users' as const,
  },
];

export default function AdminOverviewPage() {
  const env = usePaymentEnvStatus();
  const [emailConfigured, setEmailConfigured] = useState(false);

  useEffect(() => {
    const s = loadAdminSettings();
    setEmailConfigured(Boolean(s.email.smtpHost && s.email.smtpUser));
  }, []);

  const stats = useMemo(() => {
    const paid = MOCK_ADMIN_USERS.flatMap((u) => u.purchases.filter((p) => p.status === 'paid'));
    return {
      users: MOCK_ADMIN_USERS.length,
      banned: MOCK_ADMIN_USERS.filter((u) => u.banned).length,
      usd: paid.reduce((sum, p) => sum + p.usdAmount, 0),
      stars: paid.reduce((sum, p) => sum + p.starsAmount, 0),
    };
  }, []);

  const connected = {
    now: env.nowpayments,
    tg: env.telegram,
    email: emailConfigured,
    users: true,
  };

  return (
    <div>
      <PageHeader
        kicker="Control room"
        title="Payments use the Erogram accounts."
        description="Crypto and Stars share Erogram’s NOWPayments key and VIP payment bot. Email templates are still preview-only."
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Mock users', value: String(stats.users) },
          { label: 'Banned', value: String(stats.banned) },
          { label: 'Paid USD (demo)', value: `$${stats.usd}` },
          { label: 'Stars (demo)', value: String(stats.stars) },
        ].map((item) => (
          <Panel key={item.label} className="!p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">{item.label}</p>
            <p className="mt-3 text-3xl font-black tracking-tight">{item.value}</p>
          </Panel>
        ))}
      </div>

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
