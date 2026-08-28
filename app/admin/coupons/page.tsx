'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminHeaders } from '@/lib/adminApi';
import type { Coupon, CouponType } from '@/lib/coupons';
import { couponRewardLabel } from '@/lib/coupons/pricing';
import { Field, PageHeader, Panel, SaveButton, inputClass } from '../components/AdminUi';

const EMPTY_FORM = {
  id: '',
  code: 'SAVE10',
  label: '10% off',
  type: 'percent_off' as CouponType,
  creditsAmount: '50',
  discountPercent: '10',
  discountUsd: '5',
  enabled: true,
  newUsersOnly: false,
  oncePerUser: true,
  maxRedemptions: '',
  expiresAt: '',
  note: 'Stacks with country Stars discounts (20% country + 10% coupon = 30% off)',
};

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/coupons', { headers: adminHeaders() });
      const json = (await res.json()) as { coupons?: Coupon[]; message?: string };
      if (!res.ok) {
        setError(json.message || 'Could not load coupons.');
        return;
      }
      setCoupons(json.coupons || []);
    } catch {
      setError('Could not load coupons.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function resetForm() {
    setForm(EMPTY_FORM);
  }

  function editCoupon(coupon: Coupon) {
    setForm({
      id: coupon.id,
      code: coupon.code,
      label: coupon.label,
      type: coupon.type,
      creditsAmount: String(coupon.creditsAmount || 50),
      discountPercent: String(coupon.discountPercent || 10),
      discountUsd: String(coupon.discountUsd || 5),
      enabled: coupon.enabled,
      newUsersOnly: coupon.newUsersOnly,
      oncePerUser: coupon.oncePerUser,
      maxRedemptions: coupon.maxRedemptions == null ? '' : String(coupon.maxRedemptions),
      expiresAt: coupon.expiresAt ? coupon.expiresAt.slice(0, 10) : '',
      note: coupon.note,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function saveCoupon(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNote('');
    const res = await fetch('/api/admin/coupons', {
      method: 'POST',
      headers: adminHeaders(),
      body: JSON.stringify({
        id: form.id || undefined,
        code: form.code,
        label: form.label,
        type: form.type,
        creditsAmount: Number(form.creditsAmount) || 0,
        discountPercent: Number(form.discountPercent) || 0,
        discountUsd: Number(form.discountUsd) || 0,
        enabled: form.enabled,
        newUsersOnly: form.newUsersOnly,
        oncePerUser: form.oncePerUser,
        maxRedemptions: form.maxRedemptions.trim() ? Number(form.maxRedemptions) : null,
        expiresAt: form.expiresAt.trim() || null,
        note: form.note,
      }),
    });
    const json = (await res.json()) as { message?: string; coupon?: Coupon };
    setSaving(false);
    if (!res.ok) {
      setError(json.message || 'Could not save coupon.');
      return;
    }
    setNote(form.id ? `Updated ${json.coupon?.code}.` : `Created ${json.coupon?.code}.`);
    resetForm();
    await load();
  }

  async function toggleEnabled(coupon: Coupon) {
    setError('');
    setNote('');
    const res = await fetch('/api/admin/coupons', {
      method: 'PUT',
      headers: adminHeaders(),
      body: JSON.stringify({ id: coupon.id, enabled: !coupon.enabled }),
    });
    const json = (await res.json()) as { message?: string };
    if (!res.ok) {
      setError(json.message || 'Could not update coupon.');
      return;
    }
    setNote(`${coupon.code} is now ${coupon.enabled ? 'disabled' : 'enabled'}.`);
    await load();
  }

  async function removeCoupon(coupon: Coupon) {
    if (!window.confirm(`Delete coupon ${coupon.code}? Existing redemptions stay in history.`)) return;
    const res = await fetch(`/api/admin/coupons?id=${encodeURIComponent(coupon.id)}`, {
      method: 'DELETE',
      headers: adminHeaders(),
    });
    const json = (await res.json()) as { message?: string };
    if (!res.ok) {
      setError(json.message || 'Could not delete coupon.');
      return;
    }
    if (form.id === coupon.id) resetForm();
    await load();
  }

  return (
    <div className="space-y-5">
      <PageHeader
        kicker="Growth"
        title="Coupons"
        description="Price coupons take % or $ off checkout. A 10% code stacks on country Stars discounts: 20% country + 10% coupon = 30% off."
      />

      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black">{form.id ? 'Edit coupon' : 'Create coupon'}</h2>
            <p className="mt-1 text-sm text-white/40">
              For Stars, percent coupons add on top of the country rate. Example: GB already 20% off, SAVE10 invoices 30% off catalog.
            </p>
          </div>
          {form.id ? (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-full border border-white/15 px-4 py-2 text-xs font-bold text-white/70 hover:bg-white/5"
            >
              New coupon
            </button>
          ) : null}
        </div>

        <form className="mt-5 space-y-4" onSubmit={(event) => void saveCoupon(event)}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Code">
              <input
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                className={inputClass}
                placeholder="LAUNCH50"
                required
              />
            </Field>
            <Field label="Label">
              <input
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                className={inputClass}
                placeholder="Launch test drive"
              />
            </Field>
            <Field label="Type">
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as CouponType }))}
                className={inputClass}
              >
                <option value="percent_off">% off price (Stars + crypto)</option>
                <option value="amount_off">$ off price (Stars + crypto)</option>
                <option value="credits">Credits (free Stars)</option>
              </select>
            </Field>
            {form.type === 'credits' ? (
              <Field label="Stars granted">
                <input
                  type="number"
                  min={1}
                  value={form.creditsAmount}
                  onChange={(e) => setForm((f) => ({ ...f, creditsAmount: e.target.value }))}
                  className={inputClass}
                  required
                />
              </Field>
            ) : form.type === 'amount_off' ? (
              <Field label="Dollars off">
                <input
                  type="number"
                  min={0.01}
                  step="0.01"
                  value={form.discountUsd}
                  onChange={(e) => setForm((f) => ({ ...f, discountUsd: e.target.value }))}
                  className={inputClass}
                  required
                />
              </Field>
            ) : (
              <Field label="Discount %" hint="Adds to country Stars %">
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={form.discountPercent}
                  onChange={(e) => setForm((f) => ({ ...f, discountPercent: e.target.value }))}
                  className={inputClass}
                  required
                />
              </Field>
            )}
            <Field label="Max redemptions" hint="Leave blank for unlimited">
              <input
                type="number"
                min={1}
                value={form.maxRedemptions}
                onChange={(e) => setForm((f) => ({ ...f, maxRedemptions: e.target.value }))}
                className={inputClass}
                placeholder="Unlimited"
              />
            </Field>
            <Field label="Expires on" hint="Optional">
              <input
                type="date"
                value={form.expiresAt}
                onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
                className={inputClass}
              />
            </Field>
          </div>

          <Field label="Internal note">
            <input
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              className={inputClass}
              placeholder="Why this coupon exists"
            />
          </Field>

          <div className="flex flex-wrap gap-4 text-sm text-white/70">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
                className="h-4 w-4 accent-[#ff2d78]"
              />
              Enabled
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.newUsersOnly}
                onChange={(e) => setForm((f) => ({ ...f, newUsersOnly: e.target.checked }))}
                className="h-4 w-4 accent-[#ff2d78]"
              />
              New users only (no paid purchases yet)
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.oncePerUser}
                onChange={(e) => setForm((f) => ({ ...f, oncePerUser: e.target.checked }))}
                className="h-4 w-4 accent-[#ff2d78]"
              />
              Once per user
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <SaveButton disabled={saving}>{saving ? 'Saving…' : form.id ? 'Update coupon' : 'Create coupon'}</SaveButton>
            {note ? <p className="text-sm text-[#ffb0c8]">{note}</p> : null}
            {error ? <p className="text-sm text-[#ff8aa8]">{error}</p> : null}
          </div>
        </form>
      </Panel>

      <Panel>
        <h2 className="text-lg font-black">Active coupons</h2>
        {loading ? (
          <p className="mt-4 text-sm text-white/45">Loading…</p>
        ) : coupons.length === 0 ? (
          <p className="mt-4 text-sm text-white/45">No coupons yet. Create a launch code above.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-[11px] uppercase tracking-[0.14em] text-white/35">
                <tr className="border-b border-white/10">
                  <th className="py-3 pr-3 font-semibold">Code</th>
                  <th className="py-3 pr-3 font-semibold">Reward</th>
                  <th className="py-3 pr-3 font-semibold">Rules</th>
                  <th className="py-3 pr-3 font-semibold">Uses</th>
                  <th className="py-3 pr-3 font-semibold">Status</th>
                  <th className="py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((coupon) => (
                  <tr key={coupon.id} className="border-b border-white/8 align-top">
                    <td className="py-3 pr-3">
                      <p className="font-bold text-white">{coupon.code}</p>
                      <p className="text-xs text-white/40">{coupon.label || '—'}</p>
                    </td>
                    <td className="py-3 pr-3 text-white/75">
                      {couponRewardLabel(coupon)}
                    </td>
                    <td className="py-3 pr-3 text-xs text-white/55">
                      {coupon.newUsersOnly ? 'New users · ' : ''}
                      {coupon.oncePerUser ? 'Once/user' : 'Multi-use'}
                      {coupon.expiresAt ? ` · Exp ${coupon.expiresAt.slice(0, 10)}` : ''}
                    </td>
                    <td className="py-3 pr-3 tabular-nums text-white/75">
                      {coupon.redemptionCount}
                      {coupon.maxRedemptions != null ? ` / ${coupon.maxRedemptions}` : ''}
                    </td>
                    <td className="py-3 pr-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${
                          coupon.enabled ? 'bg-[#ff2d78]/20 text-[#ffb0c8]' : 'bg-white/8 text-white/40'
                        }`}
                      >
                        {coupon.enabled ? 'On' : 'Off'}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => editCoupon(coupon)}
                          className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-bold text-white/80 hover:bg-white/5"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void toggleEnabled(coupon)}
                          className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-bold text-white/80 hover:bg-white/5"
                        >
                          {coupon.enabled ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          type="button"
                          onClick={() => void removeCoupon(coupon)}
                          className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-bold text-[#ff8aa8] hover:bg-white/5"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
