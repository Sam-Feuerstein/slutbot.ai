'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Download, ImageIcon, Loader2, Share2, Trash2, Video } from 'lucide-react';
import SiteHeader from '../components/SiteHeader';
import LockedVideoCard from '../components/LockedVideoCard';
import {
  GENERATION_COMPLETE_EVENT,
  useOptionalGenerationJobs,
} from '../components/GenerationJobsProvider';
import { deleteAiToolGeneration, listAiToolGenerations } from '@/lib/actions/wavespeedImageToVideo';
import {
  downloadResult,
  mergeCollection,
  readLocalCollection,
  removeLocalCollectionItem,
} from '@/lib/collectionLocal';
import type { AiToolGenerationRecord } from '@/lib/imageToVideo/types';
import { getAuthToken } from '@/lib/desires';
import { ARCHIVE_PATH, GENERATOR_PATH, loginHref } from '@/lib/site';

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function ArchiveClient() {
  const router = useRouter();
  const [items, setItems] = useState<AiToolGenerationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [adminSession, setAdminSession] = useState(false);
  const [pushingId, setPushingId] = useState('');
  const [pushNote, setPushNote] = useState('');
  const [actionError, setActionError] = useState('');
  const generationJobs = useOptionalGenerationJobs();
  const inFlight =
    generationJobs?.jobs.filter((job) => job.phase === 'uploading' || job.phase === 'generating') ?? [];

  useEffect(() => {
    if (!getAuthToken()) {
      router.replace(loginHref(ARCHIVE_PATH));
      return;
    }

    // Privacy kill switch: never paint local/remote collection while archive is locked down.
    try {
      localStorage.removeItem('slutbot-collection');
    } catch {
      // ignore
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError('');
      setItems([]);
      const result = await listAiToolGenerations();
      if (cancelled) return;
      if (result.error?.toLowerCase().includes('sign in')) {
        router.replace(loginHref(ARCHIVE_PATH));
        return;
      }
      // Do not merge localStorage — it can retain another session's private media URLs.
      setItems(result.items || []);
      if (result.error && !(result.items || []).length) {
        setLoadError(result.error);
      }
      setLoading(false);
    })();
    const onComplete = (event: Event) => {
      const item = (event as CustomEvent<AiToolGenerationRecord>).detail;
      if (!item?.id) return;
      setItems((current) => mergeCollection([item], current));
    };
    window.addEventListener(GENERATION_COMPLETE_EVENT, onComplete);
    return () => {
      cancelled = true;
      window.removeEventListener(GENERATION_COMPLETE_EVENT, onComplete);
    };
  }, [router]);

  useEffect(() => {
    void fetch('/api/admin/me', { credentials: 'same-origin' })
      .then((res) => setAdminSession(res.ok))
      .catch(() => setAdminSession(false));
  }, []);

  const onPushToSamples = async (item: AiToolGenerationRecord) => {
    if (!adminSession || item.id.startsWith('local-')) return;
    setPushingId(item.id);
    setPushNote('');
    setActionError('');
    try {
      const res = await fetch('/api/admin/samples/generations', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generationId: item.id,
          title: `Generator ${item.mode}${item.quality ? ` · ${item.quality}` : ''}`,
        }),
      });
      const json = (await res.json()) as { message?: string; sample?: { title?: string } };
      if (!res.ok) {
        setActionError(json.message || 'Could not push to samples.');
        return;
      }
      setPushNote(`Added “${json.sample?.title || 'generation'}” to homepage samples.`);
    } catch {
      setActionError('Could not push to samples.');
    } finally {
      setPushingId('');
    }
  };

  const onDelete = async (item: AiToolGenerationRecord) => {
    if (!item.id.startsWith('local-')) {
      await deleteAiToolGeneration(item.id);
    }
    removeLocalCollectionItem(item.id, item.outputUrl);
    setItems((current) => current.filter((entry) => entry.id !== item.id && entry.outputUrl !== item.outputUrl));
  };

  return (
    <div className="w-full text-white">
      <SiteHeader />
      <div className="mx-auto w-full max-w-6xl px-3 py-6 pb-[max(1.5rem,var(--safe-bottom))] sm:px-4 sm:py-14">
        <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#ff2d78]">My collection</p>
            <h1 className="text-2xl font-black tracking-tight text-white sm:text-4xl">Past generations</h1>
          </div>
          <Link
            href={GENERATOR_PATH}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-white hover:border-[#ff2d78]/40"
          >
            Back to generator
          </Link>
        </div>

        {pushNote ? <p className="mb-4 text-sm font-medium text-emerald-300">{pushNote}</p> : null}
        {actionError ? <p className="mb-4 text-sm font-medium text-red-400">{actionError}</p> : null}

        {loading && items.length === 0 && inFlight.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-20 text-white/60">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading...
          </div>
        ) : loadError && items.length === 0 && inFlight.length === 0 ? (
          <p className="text-sm font-medium text-red-400">{loadError}</p>
        ) : items.length === 0 && inFlight.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center">
            <p className="text-sm text-white/60">No generations yet.</p>
            <Link href={GENERATOR_PATH} className="mt-4 inline-block text-sm font-semibold text-[#ff2d78] hover:underline">
              Create your first one
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {inFlight.map((job) => (
              <article
                key={job.localId}
                className="overflow-hidden rounded-2xl border border-[#ff2d78]/30 bg-white/[0.03]"
              >
                <div className="relative aspect-[3/4] bg-black">
                  {job.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={job.previewUrl} alt="" className="h-full w-full scale-105 object-cover blur-[2px]" />
                  ) : null}
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/55 px-4 text-center">
                    <Loader2 className="h-6 w-6 animate-spin text-[#ff2d78]" />
                    <p className="mt-3 text-sm font-bold text-white">
                      {job.mode === 'image' ? 'Generating image' : 'Generating video'}
                    </p>
                    <p className="mt-1 text-xs text-white/55">This stays here when it finishes</p>
                  </div>
                </div>
              </article>
            ))}
            {items.map((item) => (
              <article key={item.id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
                <div className="relative aspect-[3/4] bg-black">
                  {item.mode === 'video' && item.locked ? (
                    <LockedVideoCard previewUrl={item.outputUrl} className="h-full w-full" />
                  ) : item.mode === 'video' ? (
                    <video
                      src={item.outputUrl}
                      className="h-full w-full object-contain"
                      controls
                      playsInline
                      preload="none"
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.outputUrl} alt="" className="h-full w-full object-contain" />
                  )}
                  <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/70 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                    {item.mode === 'video' ? <Video className="h-3 w-3" /> : <ImageIcon className="h-3 w-3" />}
                    {item.locked ? 'locked' : item.mode}
                  </div>
                </div>
                <div className="space-y-3 p-4">
                  <p className="text-xs text-white/45">{formatWhen(item.createdAt)}</p>
                  {item.prompt ? <p className="line-clamp-2 text-sm text-white/75">{item.prompt}</p> : null}
                  {item.mode === 'video' ? (
                    <p className="text-xs text-white/45">
                      {item.videoModel === 'cheap'
                        ? 'Basic'
                        : item.quality === '1080p'
                          ? '1080 · Ultra high quality'
                          : item.quality === '720p'
                            ? '720 · High quality'
                            : '480 · Normal quality'}
                      {item.duration ? ` · ${item.duration}s` : ''}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    {adminSession && !item.id.startsWith('local-') ? (
                      <button
                        type="button"
                        disabled={pushingId === item.id}
                        onClick={() => void onPushToSamples(item)}
                        className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-amber-300/35 bg-amber-400/10 px-3 py-2.5 text-xs font-bold text-amber-100 hover:bg-amber-400/20 disabled:opacity-50"
                      >
                        <Share2 className="h-3.5 w-3.5" />
                        {pushingId === item.id ? 'Pushing…' : 'Push to samples'}
                      </button>
                    ) : null}
                    {!item.locked ? (
                      <button
                        type="button"
                        onClick={() =>
                          void downloadResult(
                            item.outputUrl,
                            `slutbot-${item.mode}.${item.mode === 'video' ? 'mp4' : 'jpg'}`,
                          )
                        }
                        className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-[#ff2d78] px-3 py-2.5 text-xs font-bold text-white hover:bg-[#ff1a6b]"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => void onDelete(item)}
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.06] px-3 py-2.5 text-xs font-bold text-white hover:bg-white/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
