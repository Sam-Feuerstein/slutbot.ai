'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminHeaders } from '@/lib/adminApi';
import { Field, PageHeader, Panel, SaveButton, inputClass } from '../components/AdminUi';

export default function AdminPromptsPage() {
  const [videoPrompt, setVideoPrompt] = useState('');
  const [imagePrompt, setImagePrompt] = useState('');
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
        defaultVideoPrompt?: string;
        defaultImagePrompt?: string;
        message?: string;
      };
      if (!res.ok) {
        setError(data.message || 'Could not load prompts.');
        return;
      }
      setVideoPrompt(data.videoPrompt || '');
      setImagePrompt(data.imagePrompt || '');
      setDefaultVideoPrompt(data.defaultVideoPrompt || '');
      setDefaultImagePrompt(data.defaultImagePrompt || '');
    } catch {
      setError('Could not load prompts.');
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
      body: JSON.stringify({ videoPrompt, imagePrompt }),
    });
    const data = (await res.json()) as {
      videoPrompt?: string;
      imagePrompt?: string;
      message?: string;
    };
    if (!res.ok) {
      setError(data.message || 'Could not save.');
      return;
    }
    setVideoPrompt(data.videoPrompt || videoPrompt);
    setImagePrompt(data.imagePrompt || imagePrompt);
    setSaved(true);
  }

  return (
    <form onSubmit={onSubmit}>
      <PageHeader
        kicker="Generator"
        title="Hidden prompts"
        description="Users never see these. Every image and video generation uses the matching prompt to undress the uploaded photo."
        action={<SaveButton>Save prompts</SaveButton>}
      />

      <div className="space-y-5">
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
            Applied server-side on every 5-second video. The public tool has no motion prompt field.
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
        {saved ? <p className="text-sm text-[#ffb0c8]">Saved. New generations will use these prompts.</p> : null}
      </div>
    </form>
  );
}
