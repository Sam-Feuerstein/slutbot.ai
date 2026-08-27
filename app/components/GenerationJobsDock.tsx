'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Archive, Check, ChevronDown, ImageIcon, Loader2, Video, X } from 'lucide-react';
import type { VideoModel } from '@/lib/imageToVideo/types';
import { GENERATOR_PATH } from '@/lib/site';
import type { TrackedGeneration, TrackedGenerationPhase } from './generationJobTypes';

function estimateSeconds(phase: TrackedGenerationPhase, mode: 'image' | 'video', videoModel: VideoModel | null) {
  if (phase === 'uploading') return 8;
  if (phase === 'done' || phase === 'error') return 1;
  if (mode === 'image') return 45;
  return videoModel === 'cheap' ? 60 : 90;
}

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [active]);
  return now;
}

function JobProgress({ job }: { job: TrackedGeneration }) {
  const ticking = job.phase === 'uploading' || job.phase === 'generating';
  const now = useNow(ticking);
  const origin = job.generatingAt || job.startedAt;
  const elapsed = Math.max(0, Math.floor((now - origin) / 1000));
  const total = estimateSeconds(job.phase, job.mode, job.videoModel);
  const remaining = Math.max(0, total - elapsed);
  const progress =
    job.phase === 'done' ? 100 : job.phase === 'error' ? 100 : Math.min(96, (elapsed / total) * 100);

  const label =
    job.phase === 'uploading'
      ? 'Uploading photo'
      : job.phase === 'error'
        ? job.error || 'Generation failed'
        : job.phase === 'done'
          ? job.mode === 'image'
            ? 'Image ready'
            : 'Video ready'
          : job.mode === 'image'
            ? 'Generating image'
            : 'Generating video';

  return (
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-bold text-white">{label}</p>
      {job.phase === 'error' ? (
        <p className="mt-0.5 line-clamp-2 text-xs text-red-300">{job.error || 'Something went wrong.'}</p>
      ) : job.phase === 'done' ? (
        <p className="mt-0.5 text-xs text-white/55">Saved to My collection</p>
      ) : (
        <p className="mt-0.5 text-xs tabular-nums text-white/55">
          {remaining > 0 ? `About ${remaining}s left` : 'Finishing up…'}
        </p>
      )}
      {ticking ? (
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-[#ff2d78] transition-[width] duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}

function JobThumb({ job }: { job: TrackedGeneration }) {
  const spinning = job.phase === 'uploading' || job.phase === 'generating';
  return (
    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-black">
      {job.previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={job.previewUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-white/40">
          {job.mode === 'image' ? <ImageIcon className="h-4 w-4" /> : <Video className="h-4 w-4" />}
        </div>
      )}
      {spinning ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/35">
          <Loader2 className="h-4 w-4 animate-spin text-white" />
        </div>
      ) : job.phase === 'done' ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/25">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#ff2d78] text-white">
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
          </span>
        </div>
      ) : null}
    </div>
  );
}

export default function GenerationJobsDock({
  jobs,
  activeCount,
  expanded,
  setExpanded,
  dismissJob,
  markJobSeen,
}: {
  jobs: TrackedGeneration[];
  activeCount: number;
  expanded: boolean;
  setExpanded: (open: boolean) => void;
  dismissJob: (localId: string) => void;
  markJobSeen: (localId: string) => void;
}) {
  const pathname = usePathname();
  const hidden =
    pathname.startsWith('/admin') || pathname.startsWith('/login') || pathname.startsWith('/checkout');

  const visibleJobs = useMemo(
    () => jobs.filter((job) => job.phase !== 'done' || !job.seen).slice(0, 5),
    [jobs],
  );

  if (hidden || visibleJobs.length === 0) return null;
  const lead = visibleJobs[0];
  if (!lead) return null;
  const readyCount = visibleJobs.filter((job) => job.phase === 'done').length;
  const headline =
    lead.phase === 'error'
      ? 'Generation failed'
      : readyCount > 0 && activeCount === 0
        ? readyCount === 1
          ? lead.mode === 'image'
            ? 'Image ready'
            : 'Video ready'
          : `${readyCount} ready`
        : activeCount > 1
          ? `${activeCount} generating`
          : lead.mode === 'image'
            ? 'Generating image'
            : 'Generating video';

  return (
    <div className="pointer-events-none fixed bottom-[max(1rem,var(--safe-bottom))] right-3 z-[90] w-[min(calc(100vw-1.5rem),22rem)] sm:right-5">
      {expanded ? (
        <section
          role="status"
          aria-live="polite"
          className="pointer-events-auto overflow-hidden rounded-2xl border border-white/10 bg-[#141414]/95 shadow-[0_18px_50px_rgba(0,0,0,0.55)] backdrop-blur-md"
        >
          <header className="flex items-center justify-between gap-3 border-b border-white/10 px-3.5 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold text-white">{headline}</p>
              <p className="text-[11px] text-white/45">Keep browsing — this runs in the background</p>
            </div>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white/55 transition hover:bg-white/10 hover:text-white"
              aria-label="Minimize generation progress"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </header>

          <ul className="max-h-[min(52dvh,24rem)] space-y-3 overflow-y-auto px-3.5 py-3">
            {visibleJobs.map((job) => (
              <li key={job.localId} className="flex items-start gap-3">
                <JobThumb job={job} />
                <JobProgress job={job} />
                {job.phase === 'done' || job.phase === 'error' ? (
                  <button
                    type="button"
                    onClick={() => {
                      markJobSeen(job.localId);
                      dismissJob(job.localId);
                    }}
                    className="mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white/40 transition hover:bg-white/10 hover:text-white"
                    aria-label="Dismiss"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>

          <footer className="flex items-center gap-2 border-t border-white/10 px-3.5 py-2.5">
            {readyCount > 0 ? (
              <Link
                href={GENERATOR_PATH}
                onClick={() => visibleJobs.filter((job) => job.phase === 'done').forEach((job) => markJobSeen(job.localId))}
                className="inline-flex min-h-9 flex-1 items-center justify-center rounded-xl bg-[#ff2d78] px-3 text-xs font-extrabold text-white hover:bg-[#ff1a6b]"
              >
                View result
              </Link>
            ) : (
              <p className="flex-1 text-[11px] text-white/40">You can start another or explore the site.</p>
            )}
            <Link
              href="/archive"
              className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-white/15 px-3 text-xs font-bold text-white/80 hover:bg-white/10 hover:text-white"
            >
              <Archive className="h-3.5 w-3.5" />
              Collection
            </Link>
          </footer>
        </section>
      ) : (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="pointer-events-auto flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-[#141414]/95 px-3 py-2.5 text-left shadow-[0_18px_50px_rgba(0,0,0,0.55)] backdrop-blur-md"
          aria-label="Show generation progress"
        >
          <JobThumb job={lead} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-extrabold text-white">{headline}</p>
            <p className="text-[11px] text-white/50">
              {activeCount > 0 ? 'Tap to see progress' : 'Tap to open'}
            </p>
          </div>
          {activeCount > 0 ? (
            <span className="relative inline-flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#ff2d78]/70" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#ff2d78]" />
            </span>
          ) : (
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#ff2d78] text-white">
              <Check className="h-3.5 w-3.5" strokeWidth={3} />
            </span>
          )}
        </button>
      )}
    </div>
  );
}
