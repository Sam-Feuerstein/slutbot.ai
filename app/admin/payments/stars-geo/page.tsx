'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { adminHeaders } from '@/lib/adminApi';
import { Field, PageHeader, Panel, SaveButton, inputClass } from '../../components/AdminUi';
import type { StarsGeoMode, StarsGeoRule } from '@/lib/starsGeo/types';

type Pack = { id: string; tier: string; baseStars: number };
type CountryOption = { code: string; name: string };

type Payload = {
  enabled: boolean;
  roundUpTo: number;
  rules: StarsGeoRule[];
  countries: CountryOption[];
  packs: Pack[];
  preview?: Array<{ country: string; packs: Array<{ id: string; stars: number }> }>;
};

const EMPTY_FORM = {
  country: 'GB',
  name: '',
  enabled: true,
  mode: 'discount_percent' as StarsGeoMode,
  discountPercent: '20',
  typicalUsdNote: '',
  roundUpTo: '',
  customStars: {} as Record<string, string>,
};

export default function StarsGeoAdminPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [filter, setFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/stars-geo', { headers: adminHeaders() });
      const json = (await res.json()) as Payload & { message?: string };
      if (!res.ok) {
        setError(json.message || 'Could not load Stars geo rules.');
        return;
      }
      setData(json);
      setForm((prev) => ({
        ...prev,
        customStars: Object.fromEntries((json.packs || []).map((pack) => [pack.id, prev.customStars[pack.id] || ''])),
      }));
    } catch {
      setError('Could not load Stars geo rules.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const previewByCountry = useMemo(() => {
    const map = new Map<string, Record<string, number>>();
    for (const row of data?.preview || []) {
      map.set(row.country, Object.fromEntries(row.packs.map((pack) => [pack.id, pack.stars])));
    }
    return map;
  }, [data?.preview]);

  const countryOptions = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const list = data?.countries || [];
    if (!q) return list;
    return list.filter((row) => row.code.toLowerCase().includes(q) || row.name.toLowerCase().includes(q));
  }, [data?.countries, filter]);

  async function saveConfig(event: React.FormEvent) {
    event.preventDefault();
    if (!data) return;
    setSaving(true);
    setError('');
    setNote('');
    const res = await fetch('/api/admin/stars-geo', {
      method: 'PUT',
      headers: adminHeaders(),
      body: JSON.stringify({ enabled: data.enabled, roundUpTo: data.roundUpTo }),
    });
    const json = (await res.json()) as { message?: string };
    setSaving(false);
    if (!res.ok) {
      setError(json.message || 'Could not save.');
      return;
    }
    setNote('Global settings saved.');
    await load();
  }

  async function seedDefaults() {
    setSaving(true);
    setError('');
    setNote('');
    const res = await fetch('/api/admin/stars-geo', {
      method: 'PUT',
      headers: adminHeaders(),
      body: JSON.stringify({ seed: true }),
    });
    const json = (await res.json()) as { message?: string; seeded?: number };
    setSaving(false);
    if (!res.ok) {
      setError(json.message || 'Could not add defaults.');
      return;
    }
    setNote(`Added ${json.seeded ?? 0} high-cost markets at 20% off. Existing countries were left unchanged.`);
    await load();
  }

  async function seedAsia() {
    setSaving(true);
    setError('');
    setNote('');
    const res = await fetch('/api/admin/stars-geo', {
      method: 'PUT',
      headers: adminHeaders(),
      body: JSON.stringify({ seedAsia: true }),
    });
    const json = (await res.json()) as { message?: string; seeded?: number };
    setSaving(false);
    if (!res.ok) {
      setError(json.message || 'Could not add Asian countries.');
      return;
    }
    setNote(`Added ${json.seeded ?? 0} Asian countries at 20% off. Existing countries were left unchanged.`);
    await load();
  }

  async function saveCountry(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNote('');
    const customStars = Object.fromEntries(
      Object.entries(form.customStars)
        .map(([id, value]) => [id, Number(value)])
        .filter(([, value]) => Number.isFinite(value) && Number(value) >= 1),
    );
    const res = await fetch('/api/admin/stars-geo', {
      method: 'POST',
      headers: adminHeaders(),
      body: JSON.stringify({
        country: form.country,
        name: form.name,
        enabled: form.enabled,
        mode: form.mode,
        discountPercent: Number(form.discountPercent) || 0,
        customStars,
        typicalUsdNote: form.typicalUsdNote,
        roundUpTo: form.roundUpTo ? Number(form.roundUpTo) : null,
      }),
    });
    const json = (await res.json()) as { message?: string };
    setSaving(false);
    if (!res.ok) {
      setError(json.message || 'Could not save country.');
      return;
    }
    setNote(`Saved ${form.country.toUpperCase()}.`);
    setForm((prev) => ({ ...EMPTY_FORM, customStars: prev.customStars }));
    await load();
  }

  async function removeCountry(country: string) {
    if (!window.confirm(`Remove ${country}? Checkout will use catalog Stars for that country.`)) return;
    const res = await fetch(`/api/admin/stars-geo?country=${encodeURIComponent(country)}`, {
      method: 'DELETE',
      headers: adminHeaders(),
    });
    if (!res.ok) {
      const json = (await res.json()) as { message?: string };
      setError(json.message || 'Could not delete.');
      return;
    }
    await load();
  }

  function editCountry(rule: StarsGeoRule) {
    setForm({
      country: rule.country,
      name: rule.name,
      enabled: rule.enabled,
      mode: rule.mode,
      discountPercent: String(rule.discountPercent),
      typicalUsdNote: rule.typicalUsdNote,
      roundUpTo: rule.roundUpTo == null ? '' : String(rule.roundUpTo),
      customStars: Object.fromEntries(
        (data?.packs || []).map((pack) => [pack.id, rule.customStars[pack.id] ? String(rule.customStars[pack.id]) : '']),
      ),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="space-y-5">
      <form onSubmit={saveConfig}>
        <PageHeader
          kicker="Payments"
          title="Stars by country"
          description="Only countries with a rule below get a Stars discount. Everyone else — including India, Bangladesh, and the rest of the world — pays catalog Stars. Crypto is unchanged."
          action={<SaveButton>Save global settings</SaveButton>}
        />

        <Panel>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
              <input
                type="checkbox"
                checked={data?.enabled ?? true}
                onChange={(e) => data && setData({ ...data, enabled: e.target.checked })}
                className="h-4 w-4 accent-[#ff2d78]"
              />
              <span>
                <span className="block text-sm font-bold">Enable geo pricing</span>
                <span className="text-xs text-white/40">Off = everyone pays catalog Stars</span>
              </span>
            </label>
            <Field label="Round Stars up to" hint="Discounted amounts are rounded up. 50 keeps 800, 1000, 2000 clean.">
              <input
                type="number"
                min={1}
                max={500}
                value={data?.roundUpTo ?? 50}
                onChange={(e) => data && setData({ ...data, roundUpTo: Number(e.target.value) })}
                className={inputClass}
              />
            </Field>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => void seedDefaults()}
                disabled={saving}
                className="w-full rounded-full border border-white/15 px-4 py-2.5 text-sm font-bold text-white/80 hover:bg-white/5 disabled:opacity-50"
              >
                Add ~$25 markets at 20% off
              </button>
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => void seedAsia()}
                disabled={saving}
                className="w-full rounded-full border border-white/15 px-4 py-2.5 text-sm font-bold text-white/80 hover:bg-white/5 disabled:opacity-50"
              >
                Add Asian countries at 20% off
              </button>
            </div>
          </div>
        </Panel>
      </form>

      <form onSubmit={saveCountry}>
        <Panel>
          <h2 className="text-lg font-black">Add or edit a country</h2>
          <p className="mt-1 text-sm text-white/40">
            Use a discount % for every pack, or set exact Stars per pack. Invoice amount is decided on the server from
            IP country — buyers cannot pick a cheaper region in the browser.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-white/45">Country code</p>
              <input
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value.toUpperCase() })}
                placeholder="GB"
                maxLength={2}
                className={`${inputClass} mb-2 uppercase`}
              />
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Search list"
                className={`${inputClass} mb-2`}
              />
              <select
                value={countryOptions.some((row) => row.code === form.country) ? form.country : ''}
                onChange={(e) => {
                  const code = e.target.value;
                  const match = (data?.countries || []).find((row) => row.code === code);
                  setForm({ ...form, country: code, name: match?.name || form.name });
                }}
                className={inputClass}
              >
                <option value="">Choose from list</option>
                {countryOptions.map((row) => (
                  <option key={row.code} value={row.code}>
                    {row.name} ({row.code})
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-white/35">ISO 3166-1 alpha-2, for example GB, DE, US.</p>
            </div>
            <Field label="Label" hint="Optional. Defaults to the country name.">
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="United Kingdom"
                className={inputClass}
              />
            </Field>
            <Field label="Mode">
              <select
                value={form.mode}
                onChange={(e) => setForm({ ...form, mode: e.target.value as StarsGeoMode })}
                className={inputClass}
              >
                <option value="discount_percent">Total discount %</option>
                <option value="custom_stars">Custom Stars per pack</option>
              </select>
            </Field>
            {form.mode === 'discount_percent' ? (
              <Field label="Discount %" hint="20% turns 1,000 Stars into 800 (then rounded up).">
                <input
                  type="number"
                  min={0}
                  max={90}
                  value={form.discountPercent}
                  onChange={(e) => setForm({ ...form, discountPercent: e.target.value })}
                  className={inputClass}
                />
              </Field>
            ) : (
              (data?.packs || []).map((pack) => (
                <Field key={pack.id} label={`${pack.tier} Stars`} hint={`Catalog ${pack.baseStars.toLocaleString()}`}>
                  <input
                    type="number"
                    min={1}
                    value={form.customStars[pack.id] || ''}
                    onChange={(e) =>
                      setForm({ ...form, customStars: { ...form.customStars, [pack.id]: e.target.value } })
                    }
                    className={inputClass}
                  />
                </Field>
              ))
            )}
            <Field label="Round-up override" hint="Blank = use global round-up.">
              <input
                type="number"
                min={1}
                value={form.roundUpTo}
                onChange={(e) => setForm({ ...form, roundUpTo: e.target.value })}
                placeholder="50"
                className={inputClass}
              />
            </Field>
            <Field label="Internal note">
              <input
                value={form.typicalUsdNote}
                onChange={(e) => setForm({ ...form, typicalUsdNote: e.target.value })}
                placeholder="UK Apple ~$25 → aim $20"
                className={inputClass}
              />
            </Field>
            <label className="flex items-center gap-3 self-end rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
                className="h-4 w-4 accent-[#ff2d78]"
              />
              <span className="text-sm font-bold">Country enabled</span>
            </label>
          </div>
          <div className="mt-5">
            <SaveButton>{saving ? 'Saving…' : 'Save country'}</SaveButton>
          </div>
        </Panel>
      </form>

      {error ? <p className="text-sm text-[#ffb0c8]">{error}</p> : null}
      {note ? <p className="text-sm text-emerald-300">{note}</p> : null}

      <Panel>
        <h2 className="text-lg font-black">Countries</h2>
        {loading ? (
          <p className="mt-3 text-sm text-white/45">Loading…</p>
        ) : !data?.rules.length ? (
          <p className="mt-3 text-sm text-white/45">No countries yet. Add one, or load the ~$25 market list.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-[11px] uppercase tracking-wider text-white/40">
                  <th className="pb-2 pr-3 font-semibold">Country</th>
                  <th className="pb-2 pr-3 font-semibold">Rule</th>
                  {(data.packs || []).map((pack) => (
                    <th key={pack.id} className="pb-2 pr-3 font-semibold">
                      {pack.tier}
                    </th>
                  ))}
                  <th className="pb-2 font-semibold"> </th>
                </tr>
              </thead>
              <tbody>
                {data.rules.map((rule) => {
                  const preview = previewByCountry.get(rule.country) || {};
                  return (
                    <tr key={rule.country} className="border-b border-white/8">
                      <td className="py-3 pr-3">
                        <p className="font-bold">
                          {rule.name} <span className="text-white/40">{rule.country}</span>
                        </p>
                        <p className="text-xs text-white/35">{rule.enabled ? 'On' : 'Off'}</p>
                      </td>
                      <td className="py-3 pr-3 text-white/70">
                        {rule.mode === 'custom_stars'
                          ? 'Custom Stars'
                          : `${rule.discountPercent}% off`}
                      </td>
                      {(data.packs || []).map((pack) => (
                        <td key={pack.id} className="py-3 pr-3 tabular-nums">
                          <span className="text-white/35 line-through">{pack.baseStars.toLocaleString()}</span>{' '}
                          <span className="font-semibold">{(preview[pack.id] ?? pack.baseStars).toLocaleString()}</span>
                        </td>
                      ))}
                      <td className="py-3 text-right">
                        <button
                          type="button"
                          onClick={() => editCountry(rule)}
                          className="mr-2 text-xs font-bold text-white/70 hover:text-white"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void removeCountry(rule.country)}
                          className="text-xs font-bold text-[#ffb0c8] hover:text-white"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
