'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Download, ImageIcon, Loader2, Trash2, Video } from 'lucide-react';
import SiteHeader from '../components/SiteHeader';
import { deleteAiToolGeneration, listAiToolGenerations } from '@/lib/actions/wavespeedImageToVideo';
import {
  downloadResult,
  mergeCollection,
  readLocalCollection,
  removeLocalCollectionItem,
} from '@/lib/collectionLocal';
import type { AiToolGenerationRecord } from '@/lib/imageToVideo/types';
import { getAuthToken, getImageToVideoClientId } from '../tool/clientId';
import { GENERATOR_PATH } from '@/lib/site';

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function ArchiveClient() {
  const [items, setItems] = useState<AiToolGenerationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      const local = readLocalCollection();
      const result = await listAiToolGenerations(getImageToVideoClientId(), getAuthToken());
      if (cancelled) return;
      if (result.error && !result.items.length && !local.length) setError(result.error);
      setItems(mergeCollection(result.items, local));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onDelete = async (item: AiToolGenerationRecord) => {
    if (!item.id.startsWith('local-')) {
      await deleteAiToolGeneration(item.id, getImageToVideoClientId(), getAuthToken());
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

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-white/60">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading...
          </div>
        ) : error ? (
          <p className="text-sm font-medium text-red-400">{error}</p>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center">
            <p className="text-sm text-white/60">No generations yet.</p>
            <Link href={GENERATOR_PATH} className="mt-4 inline-block text-sm font-semibold text-[#ff2d78] hover:underline">
              Create your first one
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <article key={item.id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
                <div className="relative aspect-[3/4] bg-black">
                  {item.mode === 'video' ? (
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
                    {item.mode}
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
