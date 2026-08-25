'use client';

import { PREMIUM_PLANS } from '@/lib/premiumPlans';
import { Field, PageHeader, Panel, SaveButton, inputClass, useAdminSettings } from '../components/AdminUi';

export default function AdminWalletPage() {
  const { settings, setSettings, saved, onSubmit } = useAdminSettings();

  return (
    <form onSubmit={onSubmit}>
      <PageHeader
        kicker="Wallet"
        title="Generation cost"
        description="How many Slutcoins an image or a 5-second video burn. Pack prices live on NOWPayments and Telegram Stars."
        action={<SaveButton />}
      />
      <div className="space-y-5">
        <Panel>
          <h2 className="text-lg font-black">Slutcoins per generation</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {(
              [
                ['image', 'Image'],
                ['videoBasic', '5s basic'],
                ['videoBetter', '5s better'],
                ['videoBetter720', '5s better 720'],
                ['videoBetter1080', '5s better 1080'],
              ] as const
            ).map(([key, label]) => (
              <Field key={key} label={label}>
                <input
                  type="number"
                  min={1}
                  value={settings.costs[key]}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      costs: { ...settings.costs, [key]: Number(e.target.value) },
                    })
                  }
                  className={inputClass}
                />
              </Field>
            ))}
          </div>
        </Panel>
        <Panel>
          <h2 className="text-lg font-black">Pack sizes</h2>
          <p className="mt-1 text-sm text-white/40">Slutcoin amounts shared by both payment pages.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {settings.plans.map((plan, index) => {
              const meta = PREMIUM_PLANS.find((p) => p.id === plan.id);
              return (
                <div key={plan.id} className="rounded-2xl border border-white/8 bg-black/30 p-4">
                  <p className="text-sm font-black">{meta?.tier ?? plan.id}</p>
                  <Field label="Slutcoins">
                    <input
                      type="number"
                      min={1}
                      value={plan.desires}
                      onChange={(e) => {
                        const desires = Number(e.target.value);
                        setSettings({
                          ...settings,
                          plans: settings.plans.map((row, i) => (i === index ? { ...row, desires } : row)),
                        });
                      }}
                      className={`${inputClass} mt-2`}
                    />
                  </Field>
                </div>
              );
            })}
          </div>
        </Panel>
        {saved ? <p className="text-sm text-[#ffb0c8]">Saved in this browser.</p> : null}
      </div>
    </form>
  );
}
