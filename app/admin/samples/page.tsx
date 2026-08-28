'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Trash2, Upload } from 'lucide-react';
import { adminHeaders } from '@/lib/adminApi';
import type { SampleKind, SampleWithMetrics } from '@/lib/samples';
import { Field, PageHeader, Panel, SaveButton, inputClass } from '../components/AdminUi';

type Tab = SampleKind;
type SortMode = 'manual' | 'likes24h' | 'clicks24h' | 'likesTotal';

type SampleForm = {
  id: string;
  kind: SampleKind;
  title: string;
  posterUrl: string;
  videoUrl: string;
  sourceUrl: string;
  beforeUrl: string;
  afterUrl: string;
  combinedUrl: string;
  enabled: boolean;
  pinned: boolean;
};

const EMPTY_EXAMPLE: SampleForm = {
  id: '',
  kind: 'example',
  title: '',
  posterUrl: '',
  videoUrl: '',
  sourceUrl: '',
  beforeUrl: '',
  afterUrl: '',
  combinedUrl: '',
  enabled: true,
  pinned: false,
};

const EMPTY_BEFORE: SampleForm = {
  id: '',
  kind: 'before_after',
  title: '',
  posterUrl: '',
  videoUrl: '',
  sourceUrl: '',
  beforeUrl: '',
  afterUrl: '',
  combinedUrl: '',
  enabled: true,
  pinned: false,
};

function formatCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function thumbFor(sample: SampleWithMetrics) {
  if (sample.kind === 'before_after') return sample.afterUrl || sample.beforeUrl;
  return sample.posterUrl;
}

export default function AdminSamplesPage() {
  const [tab, setTab] = useState<Tab>('example');
  const [samples, setSamples] = useState<SampleWithMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('manual');
  const [expandedId, setExpandedId] = useState('');
  const [form, setForm] = useState<SampleForm>(EMPTY_EXAMPLE);
  const [uploadingField, setUploadingField] = useState('');
  const [cardUploadKey, setCardUploadKey] = useState('');
  const [heroSlot1, setHeroSlot1] = useState('');
  const [heroSlot2, setHeroSlot2] = useState('');
  const [savingHero, setSavingHero] = useState(false);
  const [heroAssigning, setHeroAssigning] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/samples', { headers: adminHeaders() });
      const json = (await res.json()) as { samples?: SampleWithMetrics[]; message?: string };
      if (!res.ok) {
        setError(json.message || 'Could not load samples.');
        return;
      }
      setSamples(json.samples || []);
      const examples = (json.samples || []).filter((row) => row.kind === 'example');
      setHeroSlot1(examples.find((row) => row.heroSlot === 1)?.id || '');
      setHeroSlot2(examples.find((row) => row.heroSlot === 2)?.id || '');
    } catch {
      setError('Could not load samples.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => samples.filter((row) => row.kind === tab), [samples, tab]);

  const visible = useMemo(() => {
    const rows = [...filtered];
    if (sortMode === 'likes24h') rows.sort((a, b) => b.metrics.likes24h - a.metrics.likes24h);
    else if (sortMode === 'clicks24h') rows.sort((a, b) => b.metrics.clicks24h - a.metrics.clicks24h);
    else if (sortMode === 'likesTotal') rows.sort((a, b) => b.metrics.likesTotal - a.metrics.likesTotal);
    else rows.sort((a, b) => a.sortOrder - b.sortOrder);
    return rows;
  }, [filtered, sortMode]);

  const summary = useMemo(() => {
    const rows = filtered;
    return {
      count: rows.length,
      clicks24h: rows.reduce((sum, row) => sum + row.metrics.clicks24h, 0),
      likes24h: rows.reduce((sum, row) => sum + row.metrics.likes24h, 0),
      likesTotal: rows.reduce((sum, row) => sum + row.metrics.likesTotal, 0),
    };
  }, [filtered]);

  const exampleOptions = useMemo(
    () => samples.filter((row) => row.kind === 'example' && row.enabled),
    [samples],
  );

  async function assignHeroSlot(sample: SampleWithMetrics, slot: 1 | 2) {
    if (sample.kind !== 'example') return;
    const nextSlot = sample.heroSlot === slot ? 0 : slot;
    const key = `${sample.id}:${slot}`;
    setHeroAssigning(key);
    setError('');
    setNote('');
    try {
      const res = await fetch('/api/admin/samples', {
        method: 'PUT',
        headers: adminHeaders(),
        body: JSON.stringify({ id: sample.id, heroSlot: nextSlot }),
      });
      const json = (await res.json()) as { message?: string };
      if (!res.ok) {
        setError(json.message || 'Could not update hero slot.');
        return;
      }
      setNote(
        nextSlot === 0
          ? `Removed “${sample.title}” from hero.`
          : `Set “${sample.title}” as Main ${nextSlot}.`,
      );
      await load();
    } catch {
      setError('Could not update hero slot.');
    } finally {
      setHeroAssigning('');
    }
  }

  async function saveHeroSlots() {
    setSavingHero(true);
    setError('');
    setNote('');
    try {
      const res = await fetch('/api/admin/samples', {
        method: 'PUT',
        headers: adminHeaders(),
        body: JSON.stringify({ heroSlots: { slot1: heroSlot1, slot2: heroSlot2 } }),
      });
      const json = (await res.json()) as { message?: string };
      if (!res.ok) {
        setError(json.message || 'Could not update hero.');
        return;
      }
      setNote('Hero demos updated.');
      await load();
    } catch {
      setError('Could not update hero.');
    } finally {
      setSavingHero(false);
    }
  }

  function resetForm() {
    setForm(tab === 'example' ? { ...EMPTY_EXAMPLE } : { ...EMPTY_BEFORE });
  }

  function editSample(sample: SampleWithMetrics) {
    setForm({
      id: sample.id,
      kind: sample.kind,
      title: sample.title,
      posterUrl: sample.posterUrl,
      videoUrl: sample.videoUrl,
      sourceUrl: sample.sourceUrl,
      beforeUrl: sample.beforeUrl,
      afterUrl: sample.afterUrl,
      combinedUrl: sample.combinedUrl,
      enabled: sample.enabled,
      pinned: sample.pinned,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function patchSampleAsset(
    sampleId: string,
    field: 'posterUrl' | 'videoUrl' | 'sourceUrl' | 'beforeUrl' | 'afterUrl' | 'combinedUrl',
    value: string,
  ) {
    const res = await fetch('/api/admin/samples', {
      method: 'PUT',
      headers: adminHeaders(),
      body: JSON.stringify({ id: sampleId, [field]: value }),
    });
    const json = (await res.json()) as { message?: string };
    if (!res.ok) {
      setError(json.message || 'Could not update asset.');
      return false;
    }
    await load();
    return true;
  }

  async function uploadFile(field: keyof SampleForm, file: File | null) {
    if (!file) return;
    setUploadingField(field);
    setError('');
    setNote('');
    try {
      const body = new FormData();
      body.append('file', file);
      body.append('folder', tab === 'before_after' ? 'before-after' : 'examples');
      const res = await fetch('/api/admin/samples/upload', { method: 'POST', body });
      const json = (await res.json()) as { url?: string; message?: string };
      if (!res.ok || !json.url) {
        setError(json.message || 'Upload failed.');
        return;
      }
      setForm((prev) => ({ ...prev, [field]: json.url }));
      setNote(`Uploaded ${file.name}`);
    } catch {
      setError('Upload failed.');
    } finally {
      setUploadingField('');
    }
  }

  async function uploadCardAsset(
    sample: SampleWithMetrics,
    field: 'posterUrl' | 'videoUrl' | 'sourceUrl' | 'beforeUrl' | 'afterUrl' | 'combinedUrl',
    file: File | null,
  ) {
    if (!file) return;
    const key = `${sample.id}:${field}`;
    setCardUploadKey(key);
    setError('');
    try {
      const body = new FormData();
      body.append('file', file);
      body.append('folder', sample.kind === 'before_after' ? 'before-after' : 'examples');
      const res = await fetch('/api/admin/samples/upload', { method: 'POST', body });
      const json = (await res.json()) as { url?: string; message?: string };
      if (!res.ok || !json.url) {
        setError(json.message || 'Upload failed.');
        return;
      }
      const ok = await patchSampleAsset(sample.id, field, json.url);
      if (ok) setNote(`Updated ${sample.title}`);
    } catch {
      setError('Upload failed.');
    } finally {
      setCardUploadKey('');
    }
  }

  async function saveSample(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNote('');
    try {
      const res = await fetch('/api/admin/samples', {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({
          id: form.id || undefined,
          kind: tab,
          title: form.title,
          posterUrl: form.posterUrl,
          videoUrl: form.videoUrl,
          sourceUrl: form.sourceUrl,
          beforeUrl: form.beforeUrl,
          afterUrl: form.afterUrl,
          combinedUrl: form.combinedUrl,
          enabled: form.enabled,
          pinned: form.pinned,
        }),
      });
      const json = (await res.json()) as { message?: string };
      if (!res.ok) {
        setError(json.message || 'Could not save.');
        return;
      }
      setNote(form.id ? 'Sample updated.' : 'Sample created.');
      resetForm();
      await load();
    } catch {
      setError('Could not save.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleEnabled(sample: SampleWithMetrics) {
    const res = await fetch('/api/admin/samples', {
      method: 'PUT',
      headers: adminHeaders(),
      body: JSON.stringify({ id: sample.id, enabled: !sample.enabled }),
    });
    if (!res.ok) {
      const json = (await res.json()) as { message?: string };
      setError(json.message || 'Could not update.');
      return;
    }
    await load();
  }

  async function removeSample(sample: SampleWithMetrics) {
    if (!window.confirm(`Delete “${sample.title}”? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/samples?id=${encodeURIComponent(sample.id)}`, {
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

  async function move(sample: SampleWithMetrics, direction: -1 | 1) {
    if (sortMode !== 'manual') {
      setNote('Switch sort to Manual order before reordering.');
      return;
    }
    const ordered = [...filtered].sort((a, b) => a.sortOrder - b.sortOrder);
    const index = ordered.findIndex((row) => row.id === sample.id);
    const next = index + direction;
    if (index < 0 || next < 0 || next >= ordered.length) return;
    const swapped = [...ordered];
    const tmp = swapped[index];
    swapped[index] = swapped[next];
    swapped[next] = tmp;
    const res = await fetch('/api/admin/samples', {
      method: 'PUT',
      headers: adminHeaders(),
      body: JSON.stringify({ kind: tab, orderedIds: swapped.map((row) => row.id) }),
    });
    if (!res.ok) {
      const json = (await res.json()) as { message?: string };
      setError(json.message || 'Could not reorder.');
      return;
    }
    await load();
  }

  useEffect(() => {
    resetForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  return (
    <div>
      <PageHeader
        kicker="Homepage"
        title="Sample gallery"
        description="Manage example videos/stills and before/after pairs. Track clicks and anonymous likes so you can promote what the audience actually wants."
        action={
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white/70 hover:bg-white/5 hover:text-white"
          >
            Refresh
          </button>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        {[
          { label: 'Cards', value: summary.count },
          { label: 'Clicks 24h', value: summary.clicks24h },
          { label: 'Likes 24h', value: summary.likes24h },
          { label: 'Likes total', value: summary.likesTotal },
        ].map((card) => (
          <Panel key={card.label} className="!rounded-2xl !p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">{card.label}</p>
            <p className="mt-1 text-2xl font-black tabular-nums">{formatCount(card.value)}</p>
          </Panel>
        ))}
      </div>

      <Panel className="mb-8">
        <h2 className="text-lg font-black">Hero demos (top 2)</h2>
        <p className="mt-1 text-sm text-white/45">
          These two cards appear in the homepage hero next to the headline. Pick here or use{' '}
          <span className="text-white/65">Main 1 / Main 2</span> on any example card below.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Left slot">
            <select
              className={inputClass}
              value={heroSlot1}
              onChange={(e) => setHeroSlot1(e.target.value)}
            >
              <option value="">Select sample…</option>
              {exampleOptions.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.title} {row.videoUrl ? '(video)' : '(still)'} — {row.id}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Right slot">
            <select
              className={inputClass}
              value={heroSlot2}
              onChange={(e) => setHeroSlot2(e.target.value)}
            >
              <option value="">Select sample…</option>
              {exampleOptions.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.title} {row.videoUrl ? '(video)' : '(still)'} — {row.id}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <div className="flex gap-3">
            {[heroSlot1, heroSlot2].map((id, index) => {
              const sample = samples.find((row) => row.id === id);
              const thumb = sample ? thumbFor(sample) : '';
              return (
                <div
                  key={`hero-preview-${index}`}
                  className="h-24 w-16 overflow-hidden rounded-xl border border-white/10 bg-black/40"
                >
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumb} alt="" className="h-full w-full object-cover object-top" />
                  ) : null}
                </div>
              );
            })}
          </div>
          <button
            type="button"
            disabled={savingHero || !heroSlot1 || !heroSlot2}
            onClick={() => void saveHeroSlots()}
            className="rounded-full bg-[#ff2d78] px-5 py-2.5 text-sm font-bold text-white shadow-[0_10px_30px_rgba(255,45,120,0.35)] transition hover:bg-[#ff1a6b] disabled:opacity-50"
          >
            {savingHero ? 'Saving…' : 'Save hero demos'}
          </button>
        </div>
      </Panel>

      <div className="mb-5 flex flex-wrap gap-2">
        {(
          [
            { id: 'example' as const, label: 'Example videos' },
            { id: 'before_after' as const, label: 'Before / After' },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`rounded-full px-4 py-2 text-sm font-bold transition ${
              tab === item.id ? 'bg-[#ff2d78] text-white' : 'bg-white/8 text-white/55 hover:text-white'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <form onSubmit={saveSample} className="mb-8 space-y-4">
        <Panel>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-black">{form.id ? 'Edit sample' : 'Add sample'}</h2>
            {form.id ? (
              <button type="button" onClick={resetForm} className="text-xs text-white/45 hover:text-white">
                Cancel edit
              </button>
            ) : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Internal title" hint="Only you see this — use it to identify the card">
              <input
                className={inputClass}
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder={tab === 'example' ? 'Doggy sample #3' : 'Blonde before/after'}
                required
              />
            </Field>
            <div className="flex flex-wrap items-end gap-4 pb-1">
              <label className="flex items-center gap-2 text-sm text-white/70">
                <input
                  type="checkbox"
                  checked={form.enabled}
                  onChange={(e) => setForm((prev) => ({ ...prev, enabled: e.target.checked }))}
                />
                Visible on site
              </label>
              {tab === 'example' ? (
                <label className="flex items-center gap-2 text-sm text-white/70">
                  <input
                    type="checkbox"
                    checked={form.pinned}
                    onChange={(e) => setForm((prev) => ({ ...prev, pinned: e.target.checked }))}
                  />
                  Pin to top
                </label>
              ) : null}
            </div>
          </div>

          {tab === 'example' ? (
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <AssetField
                label="Poster image"
                value={form.posterUrl}
                uploading={uploadingField === 'posterUrl'}
                onChange={(value) => setForm((prev) => ({ ...prev, posterUrl: value }))}
                onFile={(file) => void uploadFile('posterUrl', file)}
                accept="image/*"
                required
              />
              <AssetField
                label="Video (optional)"
                value={form.videoUrl}
                uploading={uploadingField === 'videoUrl'}
                onChange={(value) => setForm((prev) => ({ ...prev, videoUrl: value }))}
                onFile={(file) => void uploadFile('videoUrl', file)}
                accept="video/mp4,video/webm"
                hint="Leave empty for still-only cards"
                onClear={() => setForm((prev) => ({ ...prev, videoUrl: '' }))}
              />
              <AssetField
                label="Original photo (optional)"
                value={form.sourceUrl}
                uploading={uploadingField === 'sourceUrl'}
                onChange={(value) => setForm((prev) => ({ ...prev, sourceUrl: value }))}
                onFile={(file) => void uploadFile('sourceUrl', file)}
                accept="image/*"
                hint="Small corner thumb + lightbox left side on video cards"
                onClear={() => setForm((prev) => ({ ...prev, sourceUrl: '' }))}
              />
            </div>
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <AssetField
                label="Before"
                value={form.beforeUrl}
                uploading={uploadingField === 'beforeUrl'}
                onChange={(value) => setForm((prev) => ({ ...prev, beforeUrl: value }))}
                onFile={(file) => void uploadFile('beforeUrl', file)}
                accept="image/*"
                required
              />
              <AssetField
                label="After"
                value={form.afterUrl}
                uploading={uploadingField === 'afterUrl'}
                onChange={(value) => setForm((prev) => ({ ...prev, afterUrl: value }))}
                onFile={(file) => void uploadFile('afterUrl', file)}
                accept="image/*"
                required
              />
              <AssetField
                label="Combined lightbox (optional)"
                value={form.combinedUrl}
                uploading={uploadingField === 'combinedUrl'}
                onChange={(value) => setForm((prev) => ({ ...prev, combinedUrl: value }))}
                onFile={(file) => void uploadFile('combinedUrl', file)}
                accept="image/*"
              />
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <SaveButton disabled={saving || Boolean(uploadingField)}>
              {saving ? 'Saving…' : form.id ? 'Update sample' : 'Add sample'}
            </SaveButton>
            {note ? <p className="text-sm text-emerald-300">{note}</p> : null}
            {error ? <p className="text-sm text-rose-300">{error}</p> : null}
          </div>
        </Panel>
      </form>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-black">
          {tab === 'example' ? 'Example cards' : 'Before / after cards'}
        </h2>
        <label className="flex items-center gap-2 text-sm text-white/55">
          Sort
          <select
            className={`${inputClass} !w-auto !py-1.5`}
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
          >
            <option value="manual">Manual order</option>
            <option value="likes24h">Likes 24h</option>
            <option value="clicks24h">Clicks 24h</option>
            <option value="likesTotal">Likes total</option>
          </select>
        </label>
      </div>

      {loading ? (
        <p className="text-sm text-white/45">Loading samples…</p>
      ) : (
        <div className="space-y-3">
          {visible.map((sample, index) => {
            const thumb = thumbFor(sample);
            const expanded = expandedId === sample.id;
            return (
              <Panel key={sample.id} className="!rounded-2xl !p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-xl bg-black/50">
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumb} alt="" className="h-full w-full object-cover object-top" />
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-bold text-white">{sample.title}</p>
                        {sample.kind === 'example' && !sample.posterUrl ? (
                          <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-200">
                            No poster
                          </span>
                        ) : null}
                        {!sample.enabled ? (
                          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/45">
                            Hidden
                          </span>
                        ) : null}
                        {sample.pinned ? (
                          <span className="rounded-full bg-[#ff2d78]/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#ff6b9d]">
                            Pinned
                          </span>
                        ) : null}
                        {sample.heroSlot === 1 || sample.heroSlot === 2 ? (
                          <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-200">
                            Hero {sample.heroSlot === 1 ? 'left' : 'right'}
                          </span>
                        ) : null}
                        {sample.kind === 'example' && sample.videoUrl ? (
                          <span className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/50">
                            Video
                          </span>
                        ) : null}
                        {sample.kind === 'example' && !sample.videoUrl ? (
                          <span className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/50">
                            Still
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 truncate font-mono text-[11px] text-white/35">{sample.id}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:w-[420px]">
                    <Metric label="Clk 24h" value={sample.metrics.clicks24h} />
                    <Metric label="Clk 7d" value={sample.metrics.clicks7d} />
                    <Metric label="Clk all" value={sample.metrics.clicksTotal} />
                    <Metric label="Like 24h" value={sample.metrics.likes24h} accent />
                    <Metric label="Like 7d" value={sample.metrics.likes7d} accent />
                    <Metric label="Like all" value={sample.metrics.likesTotal} accent />
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 lg:justify-end">
                    {tab === 'example' ? (
                      <>
                        <button
                          type="button"
                          disabled={heroAssigning === `${sample.id}:1`}
                          onClick={() => void assignHeroSlot(sample, 1)}
                          className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                            sample.heroSlot === 1
                              ? 'bg-amber-400/25 text-amber-100 ring-1 ring-amber-300/40'
                              : 'bg-white/8 text-white/70 hover:bg-white/12 hover:text-white'
                          }`}
                        >
                          {heroAssigning === `${sample.id}:1` ? '…' : 'Main 1'}
                        </button>
                        <button
                          type="button"
                          disabled={heroAssigning === `${sample.id}:2`}
                          onClick={() => void assignHeroSlot(sample, 2)}
                          className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                            sample.heroSlot === 2
                              ? 'bg-amber-400/25 text-amber-100 ring-1 ring-amber-300/40'
                              : 'bg-white/8 text-white/70 hover:bg-white/12 hover:text-white'
                          }`}
                        >
                          {heroAssigning === `${sample.id}:2` ? '…' : 'Main 2'}
                        </button>
                      </>
                    ) : null}
                    <IconBtn label="Move up" onClick={() => void move(sample, -1)} disabled={index === 0}>
                      <ArrowUp className="h-4 w-4" />
                    </IconBtn>
                    <IconBtn
                      label="Move down"
                      onClick={() => void move(sample, 1)}
                      disabled={index === visible.length - 1}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </IconBtn>
                    <button
                      type="button"
                      onClick={() => editSample(sample)}
                      className="rounded-full bg-white/8 px-3 py-1.5 text-xs font-bold text-white/70 hover:bg-white/12 hover:text-white"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void toggleEnabled(sample)}
                      className="rounded-full bg-white/8 px-3 py-1.5 text-xs font-bold text-white/70 hover:bg-white/12 hover:text-white"
                    >
                      {sample.enabled ? 'Hide' : 'Show'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpandedId(expanded ? '' : sample.id)}
                      className="rounded-full bg-white/8 px-3 py-1.5 text-xs font-bold text-white/70 hover:bg-white/12 hover:text-white"
                    >
                      Countries
                    </button>
                    <IconBtn label="Delete" onClick={() => void removeSample(sample)} danger>
                      <Trash2 className="h-4 w-4" />
                    </IconBtn>
                  </div>
                </div>

                {sample.kind === 'example' ? (
                  <div className="mt-4 grid gap-3 border-t border-white/8 pt-4 sm:grid-cols-3">
                    <InlineCardAsset
                      label="Poster / still"
                      value={sample.posterUrl}
                      uploading={cardUploadKey === `${sample.id}:posterUrl`}
                      accept="image/*"
                      onUpload={(file) => void uploadCardAsset(sample, 'posterUrl', file)}
                      onClear={() => void patchSampleAsset(sample.id, 'posterUrl', '')}
                      required
                    />
                    <InlineCardAsset
                      label="Video"
                      value={sample.videoUrl}
                      uploading={cardUploadKey === `${sample.id}:videoUrl`}
                      accept="video/mp4,video/webm"
                      onUpload={(file) => void uploadCardAsset(sample, 'videoUrl', file)}
                      onClear={() => void patchSampleAsset(sample.id, 'videoUrl', '')}
                      video
                    />
                    <InlineCardAsset
                      label="Original photo"
                      value={sample.sourceUrl}
                      uploading={cardUploadKey === `${sample.id}:sourceUrl`}
                      accept="image/*"
                      onUpload={(file) => void uploadCardAsset(sample, 'sourceUrl', file)}
                      onClear={() => void patchSampleAsset(sample.id, 'sourceUrl', '')}
                      hint="Corner + lightbox"
                    />
                  </div>
                ) : (
                  <div className="mt-4 grid gap-3 border-t border-white/8 pt-4 sm:grid-cols-3">
                    <InlineCardAsset
                      label="Before"
                      value={sample.beforeUrl}
                      uploading={cardUploadKey === `${sample.id}:beforeUrl`}
                      accept="image/*"
                      onUpload={(file) => void uploadCardAsset(sample, 'beforeUrl', file)}
                      required
                    />
                    <InlineCardAsset
                      label="After"
                      value={sample.afterUrl}
                      uploading={cardUploadKey === `${sample.id}:afterUrl`}
                      accept="image/*"
                      onUpload={(file) => void uploadCardAsset(sample, 'afterUrl', file)}
                      required
                    />
                    <InlineCardAsset
                      label="Combined"
                      value={sample.combinedUrl}
                      uploading={cardUploadKey === `${sample.id}:combinedUrl`}
                      accept="image/*"
                      onUpload={(file) => void uploadCardAsset(sample, 'combinedUrl', file)}
                      onClear={() => void patchSampleAsset(sample.id, 'combinedUrl', '')}
                      hint="Lightbox"
                    />
                  </div>
                )}

                {expanded ? (
                  <div className="mt-4 border-t border-white/8 pt-4">
                    {sample.metrics.byCountry.length ? (
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-sm">
                          <thead className="text-[11px] uppercase tracking-[0.14em] text-white/35">
                            <tr>
                              <th className="pb-2 pr-4 font-semibold">Country</th>
                              <th className="pb-2 pr-4 font-semibold">Clicks</th>
                              <th className="pb-2 font-semibold">Likes</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sample.metrics.byCountry.map((row) => (
                              <tr key={row.country} className="border-t border-white/5 text-white/75">
                                <td className="py-1.5 pr-4 font-mono text-xs">{row.country}</td>
                                <td className="py-1.5 pr-4 tabular-nums">{row.clicks}</td>
                                <td className="py-1.5 tabular-nums">{row.likes}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-sm text-white/40">No country data yet for this card.</p>
                    )}
                  </div>
                ) : null}
              </Panel>
            );
          })}
          {!visible.length ? (
            <Panel>
              <p className="text-sm text-white/45">No samples in this tab yet. Add one above.</p>
            </Panel>
          ) : null}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="rounded-xl bg-black/30 px-2 py-1.5 text-center">
      <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-white/35">{label}</p>
      <p className={`text-sm font-black tabular-nums ${accent ? 'text-[#ff6b9d]' : 'text-white'}`}>
        {formatCount(value)}
      </p>
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  label,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition disabled:opacity-30 ${
        danger ? 'bg-rose-500/15 text-rose-300 hover:bg-rose-500/25' : 'bg-white/8 text-white/70 hover:bg-white/12 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

function AssetField({
  label,
  value,
  onChange,
  onFile,
  accept,
  uploading,
  required,
  hint,
  onClear,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onFile: (file: File | null) => void;
  accept: string;
  uploading?: boolean;
  required?: boolean;
  hint?: string;
  onClear?: () => void;
}) {
  return (
    <Field label={label} hint={hint}>
      <div className="space-y-2">
        <input
          className={inputClass}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://… or /examples/…"
          required={required}
        />
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/12 bg-black/40 px-3 py-1.5 text-xs font-bold text-white/70 hover:bg-white/5 hover:text-white">
            <Upload className="h-3.5 w-3.5" />
            {uploading ? 'Uploading…' : 'Upload file'}
            <input
              type="file"
              accept={accept}
              className="hidden"
              disabled={uploading}
              onChange={(e) => onFile(e.target.files?.[0] || null)}
            />
          </label>
          {onClear && value ? (
            <button
              type="button"
              onClick={onClear}
              className="text-xs font-semibold text-white/45 hover:text-white"
            >
              Clear
            </button>
          ) : null}
        </div>
        {value ? (
          <div className="overflow-hidden rounded-xl border border-white/10 bg-black/40">
            {value.match(/\.(mp4|webm)(\?|$)/i) ? (
              <video src={value} className="h-28 w-full object-cover" muted playsInline />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={value} alt="" className="h-28 w-full object-cover object-top" />
            )}
          </div>
        ) : null}
      </div>
    </Field>
  );
}

function InlineCardAsset({
  label,
  value,
  uploading,
  accept,
  onUpload,
  onClear,
  required,
  hint,
  video,
}: {
  label: string;
  value: string;
  uploading?: boolean;
  accept: string;
  onUpload: (file: File | null) => void;
  onClear?: () => void;
  required?: boolean;
  hint?: string;
  video?: boolean;
}) {
  const missing = required && !value;
  return (
    <div className={`rounded-xl border bg-black/25 p-2.5 ${missing ? 'border-amber-400/35' : 'border-white/10'}`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/50">
          {label}
          {hint ? <span className="ml-1 font-medium normal-case text-white/30">({hint})</span> : null}
        </p>
        {missing ? <span className="text-[9px] font-bold uppercase text-amber-200">Missing</span> : null}
      </div>
      <div className="mb-2 overflow-hidden rounded-lg border border-white/10 bg-black/50">
        {value ? (
          video || value.match(/\.(mp4|webm)(\?|$)/i) ? (
            <video src={value} className="h-24 w-full object-cover object-top" muted playsInline />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="h-24 w-full object-cover object-top" />
          )
        ) : (
          <div className="flex h-24 items-center justify-center text-[11px] text-white/30">No file</div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-white/12 bg-white/5 px-2.5 py-1 text-[10px] font-bold text-white/70 hover:bg-white/10 hover:text-white">
          <Upload className="h-3 w-3" />
          {uploading ? 'Uploading…' : 'Upload'}
          <input
            type="file"
            accept={accept}
            className="hidden"
            disabled={uploading}
            onChange={(e) => onUpload(e.target.files?.[0] || null)}
          />
        </label>
        {onClear && value ? (
          <button
            type="button"
            onClick={onClear}
            className="text-[10px] font-semibold text-white/40 hover:text-white"
          >
            Clear
          </button>
        ) : null}
      </div>
    </div>
  );
}
