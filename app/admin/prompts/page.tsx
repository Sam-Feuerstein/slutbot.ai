'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminHeaders } from '@/lib/adminApi';
import type { VideoEngine } from '@/lib/generationSettings';
import { Field, PageHeader, Panel, SaveButton, inputClass } from '../components/AdminUi';

type EngineOption = {
  id: VideoEngine;
  label: string;
  hint: string;
  docsUrl: string;
  apiPath: string;
};

export default function AdminPromptsPage() {
  const [videoPrompt, setVideoPrompt] = useState('');
  const [imagePrompt, setImagePrompt] = useState('');
  const [videoEngine, setVideoEngine] = useState<VideoEngine>('wan_ultra_fast');
  const [engines, setEngines] = useState<EngineOption[]>([]);
  const [defaultVideoPrompt, setDefaultVideoPrompt] = useState('');
  const [defaultImagePrompt, setDefaultImagePrompt] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/generation-settings', { headers: adminHeaders() });
      const data = (await res.json()) as {
        videoPrompt?: string;
        imagePrompt?: string;
        videoEngine?: VideoEngine;
        videoEngines?: EngineOption[];
        defaultVideoPrompt?: string;
        defaultImagePrompt?: string;
        message?: string;
      };
      if (!res.ok) {
        setError(data.message || 'Could not load generation settings.');
        return;
      }
      setVideoPrompt(data.videoPrompt || '');
      setImagePrompt(data.imagePrompt || '');
      setVideoEngine(data.videoEngine === 'ltx_spicy' ? 'ltx_spicy' : 'wan_ultra_fast');
      setEngines(Array.isArray(data.videoEngines) ? data.videoEngines : []);
      setDefaultVideoPrompt(data.defaultVideoPrompt || '');
      setDefaultImagePrompt(data.defaultImagePrompt || '');
    } catch {
      setError('Could not load generation settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaved(false);
    setError('');
    const res = await fetch('/api/admin/generation-settings', {
      method: 'PUT',
      headers: adminHeaders(),
      body: JSON.stringify({ videoPrompt, imagePrompt, videoEngine }),
    });
    const data = (await res.json()) as {
      videoPrompt?: string;
      imagePrompt?: string;
      videoEngine?: VideoEngine;
      message?: string;
    };
    if (!res.ok) {
      setError(data.message || 'Could not save.');
      return;
    }
    setVideoPrompt(data.videoPrompt || videoPrompt);
    setImagePrompt(data.imagePrompt || imagePrompt);
    setVideoEngine(data.videoEngine === 'ltx_spicy' ? 'ltx_spicy' : 'wan_ultra_fast');
    setSaved(true);
  }

  const selected = engines.find((row) => row.id === videoEngine) || engines[0];

  return (
    <form onSubmit={onSubmit}>
      <PageHeader
        kicker="Generator"
        title="Prompts & models"
        description="Pick the WaveSpeed video model and the hidden prompts. Users never see these. Every generation uses what you save here."
        action={<SaveButton>Save settings</SaveButton>}
      />

      <div className="space-y-5">
        <Panel>
          <h2 className="text-lg font-black">Video model</h2>
          <p className="mt-1 text-sm text-white/45">
            Hidden prompts still apply. All user videos use the fast 5s / 8s model.
          </p>
          <div className="mt-5 space-y-3">
            {(engines.length
              ? engines
              : ([
                  {
                    id: 'wan_ultra_fast' as const,
                    label: 'WAN 2.2 · 480p Ultra Fast',
                    hint: 'Fastest / cheapest video path. Fixed 480p.',
                    docsUrl: 'https://wavespeed.ai/models/wavespeed-ai/wan-2.2/i2v-480p-ultra-fast',
                    apiPath: 'wavespeed-ai/wan-2.2/i2v-480p-ultra-fast',
                  },
                  {
                    id: 'ltx_spicy' as const,
                    label: 'LTX 2.3 Spicy',
                    hint: 'Higher quality. Supports 480 / 720 / 1080.',
                    docsUrl: 'https://wavespeed.ai/models/wavespeed-ai/ltx-2.3-spicy/image-to-video',
                    apiPath: 'wavespeed-ai/ltx-2.3-spicy/image-to-video',
                  },
                ] satisfies EngineOption[])
            ).map((engine) => {
              const active = videoEngine === engine.id;
              return (
                <label
                  key={engine.id}
                  className={`flex cursor-pointer gap-3 rounded-2xl border px-4 py-3 ${
                    active ? 'border-[#ff2d78] bg-[#ff2d78]/10' : 'border-white/10 bg-black/30'
                  }`}
                >
                  <input
                    type="radio"
                    name="videoEngine"
                    value={engine.id}
                    checked={active}
                    disabled={loading}
                    onChange={() => setVideoEngine(engine.id)}
                    className="mt-1"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-white">{engine.label}</span>
                    <span className="mt-0.5 block text-xs text-white/45">{engine.hint}</span>
                    <span className="mt-1 block font-mono text-[11px] text-white/35">{engine.apiPath}</span>
                  </span>
                </label>
              );
            })}
          </div>
          {selected?.docsUrl ? (
            <a
              href={selected.docsUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-block text-sm font-semibold text-[#ff6b9d] hover:text-white"
            >
              Open WaveSpeed model page →
            </a>
          ) : null}
        </Panel>

        <Panel>
          <h2 className="text-lg font-black">Image prompt</h2>
          <p className="mt-1 text-sm text-white/45">
            Applied server-side on every still generation. The public tool has no prompt field.
          </p>
          <div className="mt-5">
            <Field label="Prompt sent to the image model">
              <textarea
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                rows={5}
                disabled={loading}
                className={`${inputClass} min-h-[120px] resize-y`}
              />
            </Field>
            {defaultImagePrompt ? (
              <button
                type="button"
                onClick={() => setImagePrompt(defaultImagePrompt)}
                className="mt-3 text-sm font-semibold text-[#ff6b9d] hover:text-white"
              >
                Restore default
              </button>
            ) : null}
          </div>
        </Panel>

        <Panel>
          <h2 className="text-lg font-black">Video prompt</h2>
          <p className="mt-1 text-sm text-white/45">
            Applied server-side on every video. The public tool has no motion prompt field.
          </p>
          <div className="mt-5">
            <Field label="Prompt sent to the video model">
              <textarea
                value={videoPrompt}
                onChange={(e) => setVideoPrompt(e.target.value)}
                rows={6}
                disabled={loading}
                className={`${inputClass} min-h-[140px] resize-y`}
              />
            </Field>
            {defaultVideoPrompt ? (
              <button
                type="button"
                onClick={() => setVideoPrompt(defaultVideoPrompt)}
                className="mt-3 text-sm font-semibold text-[#ff6b9d] hover:text-white"
              >
                Restore default
              </button>
            ) : null}
          </div>
        </Panel>
        {error ? <p className="text-sm text-[#ffb0c8]">{error}</p> : null}
        {saved ? (
          <p className="text-sm text-[#ffb0c8]">Saved. New generations use these prompts and the selected model.</p>
        ) : null}
      </div>
    </form>
  );
}
