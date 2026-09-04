'use client';

import { useEffect, useState } from 'react';
import { PREMIUM_PLANS, formatStarsWithUsd } from '@/lib/premiumPlans';
import {
  Field,
  PageHeader,
  Panel,
  SaveButton,
  StatusChip,
  inputClass,
  useAdminSettings,
  usePaymentEnvStatus,
} from '../../components/AdminUi';

type WebhookStatus = {
  configured?: boolean;
  blocked?: boolean;
  username?: string;
  webhookUrl?: string;
  targetUrl?: string;
  webhookIsOurs?: boolean;
  identityError?: string;
  lastErrorMessage?: string;
};

export default function TelegramStarsPage() {
  const { settings, setSettings, saved, onSubmit } = useAdminSettings();
  const env = usePaymentEnvStatus();
  const [hook, setHook] = useState<WebhookStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  async function loadHook() {
    const res = await fetch('/api/admin/telegram-webhook', { credentials: 'same-origin' });
    if (!res.ok) return;
    setHook((await res.json()) as WebhookStatus);
  }

  useEffect(() => {
    void loadHook();
  }, []);

  async function pointWebhookHere() {
    setBusy(true);
    setNote('');
    try {
      const res = await fetch('/api/admin/telegram-webhook', {
        method: 'POST',
        credentials: 'same-origin',
      });
      const data = (await res.json()) as { message?: string; username?: string; url?: string };
      if (!res.ok) {
        setNote(data.message || 'Could not set webhook.');
        return;
      }
      setNote(`Webhook pointed at ${data.url} for @${data.username}. Erogramx was not changed.`);
      await loadHook();
    } catch {
      setNote('Could not set webhook.');
    } finally {
      setBusy(false);
    }
  }

  const blocked = Boolean(hook?.blocked);
  const ready = Boolean(env.telegram && hook?.webhookIsOurs && !blocked);

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <PageHeader
        kicker="Telegram"
        title="Stars payments"
        description="Dedicated AI SLUTBOT bot. Never the Erogram VIP bot. Create it in @BotFather, put the token in TELEGRAM_PAYMENT_BOT_TOKEN, then point the webhook here."
        action={
          <div className="flex items-center gap-3">
            <StatusChip connected={ready} />
            <SaveButton>Save Stars prices</SaveButton>
          </div>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <Panel>
          <h2 className="text-lg font-black">AI SLUTBOT bot</h2>
          <p className="mt-1 text-sm text-white/40">
            Telegram only lets you create bots in Telegram (@BotFather). This admin page wires that bot to
            aislutbot.com. It will refuse @erogramvipbot so Erogramx is never touched.
          </p>
          <div className="mt-5 space-y-3 text-sm">
            <div className="rounded-2xl border border-white/8 bg-black/30 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/35">Bot</p>
              <p className="mt-1 font-semibold">
                {!hook
                  ? 'Checking…'
                  : hook.username
                    ? `@${hook.username}${blocked ? ' — blocked (Erogram)' : ''}`
                    : env.telegram
                      ? hook.identityError || 'Token loaded, identity unknown'
                      : 'TELEGRAM_PAYMENT_BOT_TOKEN missing'}
              </p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/30 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/35">
                Telegram webhook now
              </p>
              <p className="mt-1 break-all font-semibold text-white/80">{hook?.webhookUrl || '—'}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/30 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/35">Must be</p>
              <p className="mt-1 break-all font-semibold text-white/80">{hook?.targetUrl || '—'}</p>
            </div>
            <ol className="list-decimal space-y-1 rounded-2xl border border-dashed border-white/12 bg-black/20 px-4 py-3 pl-8 text-xs leading-relaxed text-white/55">
              <li>Open Telegram → @BotFather → /newbot</li>
              <li>Name it e.g. AI SLUTBOT Payments</li>
              <li>Copy the token into TELEGRAM_PAYMENT_BOT_TOKEN (.env.local and Vercel)</li>
              <li>Redeploy, then click Point webhook at aislutbot.com</li>
            </ol>
            <button
              type="button"
              disabled={busy || !env.telegram || blocked}
              onClick={() => void pointWebhookHere()}
              className="rounded-full bg-white/10 px-5 py-2.5 text-sm font-bold text-white hover:bg-white/15 disabled:opacity-40"
            >
              {busy ? 'Pointing webhook…' : 'Point webhook at aislutbot.com'}
            </button>
            {blocked ? (
              <p className="text-sm text-rose-300">
                Current token is the Erogram bot. Replace TELEGRAM_PAYMENT_BOT_TOKEN with a new bot. Do not
                click webhook on this token.
              </p>
            ) : null}
            {note ? <p className="text-sm text-[#ffb0c8]">{note}</p> : null}
            {hook?.lastErrorMessage ? (
              <p className="text-xs text-amber-200">Telegram last error: {hook.lastErrorMessage}</p>
            ) : null}
          </div>
        </Panel>

        <Panel>
          <h2 className="text-lg font-black">Stars pricing</h2>
          <p className="mt-1 text-sm text-white/40">
            These fields are a local preview. Live Telegram invoices use catalog Stars. List USD is 1,000 Stars = $25.
            Crypto still uses the NOWPayments USD prices.
          </p>
          <div className="mt-5 space-y-3">
            {settings.plans.map((plan, index) => {
              const meta = PREMIUM_PLANS.find((p) => p.id === plan.id);
              const usdGuide = formatStarsWithUsd(plan.starsPrice);
              return (
                <div
                  key={plan.id}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-white/8 bg-black/30 px-4 py-3"
                >
                  <div>
                    <p className="font-black">{meta?.tier ?? plan.id}</p>
                    <p className="text-xs text-white/40">
                      {plan.desires.toLocaleString()} Stars · {usdGuide}
                    </p>
                  </div>
                  <div className="w-32">
                    <Field label="Stars">
                      <input
                        type="number"
                        min={1}
                        value={plan.starsPrice}
                        onChange={(e) => {
                          const starsPrice = Number(e.target.value);
                          setSettings({
                            ...settings,
                            plans: settings.plans.map((row, i) => (i === index ? { ...row, starsPrice } : row)),
                          });
                        }}
                        className={inputClass}
                      />
                    </Field>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
      {saved ? (
        <p className="text-sm text-[#ffb0c8]">
          Preview prices saved in this browser. Live invoices use catalog Stars, then country rules from{' '}
          <a href="/admin/payments/stars-geo" className="underline">
            Stars by country
          </a>
          .
        </p>
      ) : null}
    </form>
  );
}
