'use client';

import { PREMIUM_PLANS } from '@/lib/premiumPlans';
import { SITE_DOMAIN } from '@/lib/site';
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

export default function NowPaymentsPage() {
  const { settings, setSettings, saved, onSubmit } = useAdminSettings();
  const env = usePaymentEnvStatus();
  const connected = env.nowpayments;

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <PageHeader
        kicker="Crypto"
        title="NOWPayments"
        description="Same API key as Erogram. Invoices use this account; IPN comes back here so Erogram VIP is never mixed with AI SLUTBOT packs."
        action={
          <div className="flex items-center gap-3">
            <StatusChip connected={connected} />
            <SaveButton>Save USD prices</SaveButton>
          </div>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <Panel>
          <h2 className="text-lg font-black">Erogram account</h2>
          <p className="mt-1 text-sm text-white/40">
            Keys live in the server env, copied from Erogram. Checkout does not use the fields on this screen.
          </p>
          <div className="mt-5 space-y-3 text-sm">
            <div className="rounded-2xl border border-white/8 bg-black/30 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/35">API</p>
              <p className="mt-1 font-semibold">
                {env.loaded ? (connected ? 'NOWPAYMENTS_API_KEY loaded' : 'Missing in .env.local') : 'Checking…'}
              </p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/30 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/35">Pay currency</p>
              <p className="mt-1 font-semibold">usdttrc20 — same as Erogram invoices</p>
            </div>
            <div className="rounded-2xl border border-dashed border-white/12 bg-black/20 px-4 py-3 text-xs text-white/40">
              Per-invoice IPN:{' '}
              <span className="text-white/70">https://{SITE_DOMAIN}/api/payments/nowpayments/webhook</span>
              <br />
              Erogram invoices still callback to erogram.pro. We never change their dashboard IPN.
            </div>
          </div>
        </Panel>

        <Panel>
          <h2 className="text-lg font-black">USD pricing</h2>
          <p className="mt-1 text-sm text-white/40">
            Live invoices bill these catalog USD amounts. Conversion base: 1,000 Stars = $25.
          </p>
          <div className="mt-5 space-y-3">
            {settings.plans.map((plan, index) => {
              const meta = PREMIUM_PLANS.find((p) => p.id === plan.id);
              return (
                <div
                  key={plan.id}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-white/8 bg-black/30 px-4 py-3"
                >
                  <div>
                    <p className="font-black">{meta?.tier ?? plan.id}</p>
                    <p className="text-xs text-white/40">{plan.desires.toLocaleString()} Stars</p>
                  </div>
                  <div className="w-28">
                    <Field label="USD">
                      <input
                        type="number"
                        min={0.01}
                        step="0.01"
                        value={plan.usdPrice}
                        onChange={(e) => {
                          const usdPrice = Number(e.target.value);
                          setSettings({
                            ...settings,
                            plans: settings.plans.map((row, i) => (i === index ? { ...row, usdPrice } : row)),
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
      {saved ? <p className="text-sm text-[#ffb0c8]">Preview prices saved in this browser. Live checkout uses the catalog.</p> : null}
    </form>
  );
}
