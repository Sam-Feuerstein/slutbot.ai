'use client';

import { PREMIUM_PLANS, formatUsdPrice, usdFromStars } from '@/lib/premiumPlans';
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

export default function TelegramStarsPage() {
  const { settings, setSettings, saved, onSubmit } = useAdminSettings();
  const env = usePaymentEnvStatus();
  const connected = env.telegram;

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <PageHeader
        kicker="Telegram"
        title="Stars payments"
        description="Same Erogram VIP bot. Packs are named AI SLUTBOT Mini / Flirt / Desire / Passion / Ecstasy so they show up on that bot without mixing into VIP membership."
        action={
          <div className="flex items-center gap-3">
            <StatusChip connected={connected} />
            <SaveButton>Save Stars prices</SaveButton>
          </div>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <Panel>
          <h2 className="text-lg font-black">Erogram VIP bot</h2>
          <p className="mt-1 text-sm text-white/40">
            Token is loaded from env. This screen does not re-register Telegram webhooks.
          </p>
          <div className="mt-5 space-y-3 text-sm">
            <div className="rounded-2xl border border-white/8 bg-black/30 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/35">Bot token</p>
              <p className="mt-1 font-semibold">
                {env.loaded ? (connected ? 'TELEGRAM_PAYMENT_BOT_TOKEN loaded' : 'Missing in .env.local') : 'Checking…'}
              </p>
            </div>
            <div className="rounded-2xl border border-dashed border-white/12 bg-black/20 px-4 py-3 text-xs leading-relaxed text-white/40">
              One bot for all Stars. Invoice titles are <span className="text-white/70">AI SLUTBOT Passion</span>, not
              Erogram VIP. Money and the Telegram charge stay on the VIP bot. Erogram does not turn the buyer into a
              VIP member. Slutcoins are added to the AI SLUTBOT wallet after Telegram confirms.
            </div>
          </div>
        </Panel>

        <Panel>
          <h2 className="text-lg font-black">Stars pricing</h2>
          <p className="mt-1 text-sm text-white/40">
            These fields are a local preview. Live Telegram invoices use catalog Stars, then the country rules on
            Stars by country. USD is Stars × ($9.99 / 660) so crypto matches the same consumer value.
          </p>
          <div className="mt-5 space-y-3">
            {settings.plans.map((plan, index) => {
              const meta = PREMIUM_PLANS.find((p) => p.id === plan.id);
              const usdGuide = formatUsdPrice(usdFromStars(plan.starsPrice));
              return (
                <div
                  key={plan.id}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-white/8 bg-black/30 px-4 py-3"
                >
                  <div>
                    <p className="font-black">{meta?.tier ?? plan.id}</p>
                    <p className="text-xs text-white/40">
                      {plan.desires.toLocaleString()} Slutcoins · {usdGuide}
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
