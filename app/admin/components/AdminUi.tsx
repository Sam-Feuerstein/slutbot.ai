'use client';

import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { defaultAdminSettings, loadAdminSettings, saveAdminSettings, type AdminMockSettings } from '@/lib/adminSettings';

export function PageHeader({
  kicker,
  title,
  description,
  action,
}: {
  kicker?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        {kicker ? (
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ff6b9d]">{kicker}</p>
        ) : null}
        <h1 className="text-3xl font-black tracking-tight text-white sm:text-[34px]">{title}</h1>
        {description ? <p className="mt-2 text-sm leading-relaxed text-white/50">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.35)] sm:p-6 ${className}`}
    >
      {children}
    </section>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-white/45">{label}</span>
      {children}
      {hint ? <span className="mt-1.5 block text-xs text-white/35">{hint}</span> : null}
    </label>
  );
}

export const inputClass =
  'w-full rounded-2xl border border-white/10 bg-black/50 px-3.5 py-2.5 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#ff2d78]/70 focus:ring-2 focus:ring-[#ff2d78]/20';

export function StatusChip({ connected }: { connected: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${
        connected ? 'bg-emerald-400/15 text-emerald-300' : 'bg-white/8 text-white/45'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-emerald-400' : 'bg-amber-400'}`} />
      {connected ? 'Ready' : 'Not connected'}
    </span>
  );
}

export function MockNote() {
  return (
    <p className="rounded-2xl border border-white/8 bg-black/30 px-4 py-3 text-xs leading-relaxed text-white/40">
      Placeholder screen. Values stay in this browser only. No payment, SMTP, or Telegram API is called until you
      provide keys and we wire the next step.
    </p>
  );
}

export function SaveButton({
  children = 'Save on this device',
  disabled = false,
}: {
  children?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="rounded-full bg-[#ff2d78] px-6 py-2.5 text-sm font-bold text-white shadow-[0_10px_30px_rgba(255,45,120,0.35)] transition hover:bg-[#ff1a6b] disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function useAdminSettings() {
  const [settings, setSettings] = useState<AdminMockSettings>(defaultAdminSettings);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSettings(loadAdminSettings());
  }, []);

  function persist(next: AdminMockSettings) {
    setSettings(next);
    saveAdminSettings(next);
    setSaved(true);
  }

  function onSubmit(event: FormEvent, next = settings) {
    event.preventDefault();
    persist(next);
  }

  return { settings, setSettings, saved, persist, onSubmit };
}

export function usePaymentEnvStatus() {
  const [status, setStatus] = useState({ nowpayments: false, telegram: false, loaded: false });

  useEffect(() => {
    fetch('/api/admin/payment-status', { credentials: 'same-origin' })
      .then(async (res) => {
        if (!res.ok) {
          setStatus((s) => ({ ...s, loaded: true }));
          return;
        }
        const data = (await res.json()) as { nowpayments?: boolean; telegram?: boolean };
        setStatus({
          nowpayments: Boolean(data.nowpayments),
          telegram: Boolean(data.telegram),
          loaded: true,
        });
      })
      .catch(() => setStatus((s) => ({ ...s, loaded: true })));
  }, []);

  return status;
}
