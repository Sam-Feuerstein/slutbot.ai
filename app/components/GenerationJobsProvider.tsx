'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  listActiveGenerationJobs,
  pollWavespeedImageToVideo,
  refundFailedGeneration,
  saveAiToolGeneration,
  submitWavespeedImageEdit,
  submitWavespeedImageToVideo,
  uploadImageToVideoSource,
} from '@/lib/actions/wavespeedImageToVideo';
import { addLocalCollectionItem } from '@/lib/collectionLocal';
import { refreshDesiresFromServer, setDesires, VIDEO_DURATION_SECONDS } from '@/lib/desires';
import type { VideoModel } from '@/lib/imageToVideo/types';
import { compressImageForUpload } from '@/app/tool/compressImage';
import GenerationJobsDock from './GenerationJobsDock';
import type { StartGenerationInput, TrackedGeneration } from './generationJobTypes';

export const GENERATION_COMPLETE_EVENT = 'slutbot:generation-complete';

export type { StartGenerationInput, TrackedGeneration } from './generationJobTypes';

type GenerationJobsContextValue = {
  jobs: TrackedGeneration[];
  activeCount: number;
  startGeneration: (input: StartGenerationInput) => void;
  dismissJob: (localId: string) => void;
  markJobSeen: (localId: string) => void;
  expanded: boolean;
  setExpanded: (open: boolean) => void;
};

const STORAGE_KEY = 'slutbot-active-generations';
const POLL_MS = 2000;
const POLL_MAX = 120;

const GenerationJobsContext = createContext<GenerationJobsContextValue | null>(null);

type PersistedJob = {
  localId: string;
  taskId: string;
  mode: 'image' | 'video';
  videoModel: VideoModel | null;
  quality: string;
  duration: number | null;
  sourceKey: string;
  previewUrl: string;
  startedAt: number;
  generatingAt: number | null;
};

function isHttpUrl(value: string) {
  return value.startsWith('/') || value.startsWith('http://') || value.startsWith('https://');
}

function readPersisted(): PersistedJob[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PersistedJob[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((row) => row && typeof row.taskId === 'string' && row.taskId);
  } catch {
    return [];
  }
}

function writePersisted(jobs: TrackedGeneration[]) {
  if (typeof window === 'undefined') return;
  const rows: PersistedJob[] = jobs
    .filter((job) => job.taskId && (job.phase === 'uploading' || job.phase === 'generating'))
    .map((job) => ({
      localId: job.localId,
      taskId: job.taskId,
      mode: job.mode,
      videoModel: job.videoModel,
      quality: job.quality,
      duration: job.duration,
      sourceKey: job.sourceKey,
      previewUrl: isHttpUrl(job.previewUrl) ? job.previewUrl : '',
      startedAt: job.startedAt,
      generatingAt: job.generatingAt,
    }));
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
}

function notifyReady(mode: 'image' | 'video') {
  try {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    const kind = mode === 'image' ? 'image' : 'video';
    new Notification(`Your ${kind} is ready`, {
      body: 'Open AI SLUTBOT to watch it, or find it in My collection.',
      icon: '/icons/icon-192.png?v=3',
    });
  } catch {
    /* ignore */
  }
}

export function useGenerationJobs() {
  const ctx = useContext(GenerationJobsContext);
  if (!ctx) {
    throw new Error('useGenerationJobs must be used within GenerationJobsProvider');
  }
  return ctx;
}

export function useOptionalGenerationJobs() {
  return useContext(GenerationJobsContext);
}

export default function GenerationJobsProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<TrackedGeneration[]>([]);
  const [expanded, setExpanded] = useState(true);
  const jobsRef = useRef<TrackedGeneration[]>([]);
  const pollingRef = useRef(new Set<string>());
  const hydratedRef = useRef(false);

  const patchJob = useCallback((localId: string, patch: Partial<TrackedGeneration>) => {
    setJobs((current) =>
      current.map((job) => (job.localId === localId ? { ...job, ...patch } : job)),
    );
  }, []);

  const finishJob = useCallback(
    async (localId: string, input: {
      taskId: string;
      mode: 'image' | 'video';
      videoModel: VideoModel | null;
      quality: string;
      duration: number | null;
      sourceKey: string;
      outputUrl: string;
      locked: boolean;
      generationId?: string;
      archived?: boolean;
    }) => {
      let generationId = input.generationId || '';
      if (!input.archived && !input.locked && input.outputUrl && input.sourceKey) {
        const saved = await saveAiToolGeneration({
          mode: input.mode,
          videoModel: input.mode === 'video' ? input.videoModel : null,
          sourceKey: input.sourceKey,
          outputUrl: input.outputUrl,
          quality: input.mode === 'video' ? input.quality : '',
          duration: input.mode === 'video' ? input.duration : null,
        });
        generationId = saved.id || `local-${Date.now()}`;
      }
      const resultId = generationId || `local-${Date.now()}`;
      addLocalCollectionItem({
        id: resultId,
        mode: input.mode,
        videoModel: input.mode === 'video' ? input.videoModel : null,
        sourceImageUrl: input.sourceKey,
        outputUrl: input.outputUrl,
        locked: input.locked,
        prompt: '',
        quality: input.mode === 'video' ? input.quality : '',
        duration: input.mode === 'video' ? input.duration : null,
        createdAt: new Date().toISOString(),
      });
      window.dispatchEvent(
        new CustomEvent(GENERATION_COMPLETE_EVENT, {
          detail: {
            id: resultId,
            mode: input.mode,
            videoModel: input.mode === 'video' ? input.videoModel : null,
            sourceImageUrl: input.sourceKey,
            outputUrl: input.outputUrl,
            locked: input.locked,
            prompt: '',
            quality: input.mode === 'video' ? input.quality : '',
            duration: input.mode === 'video' ? input.duration : null,
            createdAt: new Date().toISOString(),
          },
        }),
      );
      patchJob(localId, {
        phase: 'done',
        statusText: 'Ready',
        outputUrl: input.outputUrl,
        locked: input.locked,
        generationId: resultId,
        seen: false,
      });
      setExpanded(true);
      notifyReady(input.mode);
      void refreshDesiresFromServer();
    },
    [patchJob],
  );

  const pollJob = useCallback(
    (localId: string, taskId: string) => {
      if (!taskId || pollingRef.current.has(taskId)) return;
      pollingRef.current.add(taskId);

      void (async () => {
        try {
          for (let i = 0; i < POLL_MAX; i += 1) {
            const result = await pollWavespeedImageToVideo(taskId);
            if (typeof result.desires === 'number') setDesires(result.desires);
            if (result.status === 'completed' && (result.outputUrl || result.locked)) {
              const job = jobsRef.current.find((row) => row.localId === localId);
              await finishJob(localId, {
                taskId,
                mode: job?.mode || 'video',
                videoModel: job?.videoModel || null,
                quality: job?.quality || '',
                duration: job?.duration ?? null,
                sourceKey: job?.sourceKey || '',
                outputUrl: result.outputUrl || '',
                locked: Boolean(result.locked),
                generationId: result.id,
                archived: result.archived,
              });
              return;
            }
            if (result.status === 'failed' || result.status === 'cancelled' || result.status === 'timeout') {
              throw new Error(result.error || 'Generation failed.');
            }
            patchJob(localId, {
              phase: 'generating',
              statusText: result.status === 'processing' ? 'Generating…' : 'Queued…',
            });
            await new Promise((resolve) => setTimeout(resolve, POLL_MS));
          }
          throw new Error('Timed out waiting for the result.');
        } catch (err) {
          const refunded = await refundFailedGeneration(taskId);
          if (typeof refunded.desires === 'number') setDesires(refunded.desires);
          else await refreshDesiresFromServer();
          patchJob(localId, {
            phase: 'error',
            statusText: 'Failed',
            error: err instanceof Error ? err.message : 'Something went wrong.',
          });
          setExpanded(true);
        } finally {
          pollingRef.current.delete(taskId);
        }
      })();
    },
    [finishJob, patchJob],
  );

  const runJob = useCallback(
    async (localId: string, input: StartGenerationInput) => {
      let taskId = '';
      try {
        const fd = new FormData();
        fd.set('file', await compressImageForUpload(input.file));
        const upload = await uploadImageToVideoSource(fd);
        if (upload.error || !upload.key) throw new Error(upload.error || 'Upload failed.');
        patchJob(localId, {
          phase: 'generating',
          statusText: 'Starting generation…',
          sourceKey: upload.key,
          generatingAt: Date.now(),
        });

        const submit =
          input.mode === 'image'
            ? await submitWavespeedImageEdit(upload.key)
            : await submitWavespeedImageToVideo(
                upload.key,
                input.customPrompt,
                input.quality,
                input.duration ?? VIDEO_DURATION_SECONDS,
                'tuned',
                input.videoModel,
              );
        if (typeof submit.desires === 'number') setDesires(submit.desires);
        if (submit.error || !submit.taskId) throw new Error(submit.error || 'Submit failed.');
        taskId = submit.taskId;
        patchJob(localId, {
          taskId,
          phase: 'generating',
          statusText: 'Generating…',
          sourceKey: upload.key,
          generatingAt: Date.now(),
        });
        void refreshDesiresFromServer();
        pollJob(localId, taskId);
      } catch (err) {
        if (taskId) {
          const refunded = await refundFailedGeneration(taskId);
          if (typeof refunded.desires === 'number') setDesires(refunded.desires);
        } else {
          await refreshDesiresFromServer();
        }
        patchJob(localId, {
          phase: 'error',
          statusText: 'Failed',
          error: err instanceof Error ? err.message : 'Something went wrong.',
        });
        setExpanded(true);
      }
    },
    [patchJob, pollJob],
  );

  const startGeneration = useCallback(
    (input: StartGenerationInput) => {
      const localId = crypto.randomUUID();
      const next: TrackedGeneration = {
        localId,
        taskId: '',
        mode: input.mode,
        videoModel: input.mode === 'video' ? input.videoModel : null,
        quality: input.quality,
        duration: input.mode === 'video' ? input.duration ?? VIDEO_DURATION_SECONDS : null,
        previewUrl: input.previewUrl,
        sourceKey: '',
        startedAt: Date.now(),
        generatingAt: null,
        phase: 'uploading',
        statusText: 'Uploading image…',
      };
      setJobs((current) => [next, ...current]);
      setExpanded(true);
      void runJob(localId, input);
    },
    [runJob],
  );

  const dismissJob = useCallback((localId: string) => {
    setJobs((current) => current.filter((job) => job.localId !== localId));
  }, []);

  const markJobSeen = useCallback((localId: string) => {
    patchJob(localId, { seen: true });
  }, [patchJob]);

  useEffect(() => {
    jobsRef.current = jobs;
    writePersisted(jobs);
  }, [jobs]);

  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    const persisted = readPersisted().map((row) => ({
      ...row,
      previewUrl: row.previewUrl,
      phase: 'generating' as const,
      statusText: 'Generating…',
      generatingAt: row.generatingAt || row.startedAt,
    }));
    if (persisted.length) {
      setJobs(persisted);
      setExpanded(true);
      for (const job of persisted) {
        if (job.taskId) pollJob(job.localId, job.taskId);
      }
    }

    void listActiveGenerationJobs().then(({ jobs: remote }) => {
      setJobs((current) => {
        const merged: TrackedGeneration[] = current.length ? [...current] : [...persisted];
        const extra: TrackedGeneration[] = [];
        for (const row of remote) {
          if (merged.some((job) => job.taskId === row.taskId)) continue;
          const added: TrackedGeneration = {
            localId: `remote-${row.taskId}`,
            taskId: row.taskId,
            mode: row.mode,
            videoModel: row.videoModel,
            quality: row.quality,
            duration: row.duration,
            previewUrl: row.sourceUrl,
            sourceKey: row.sourceKey,
            startedAt: row.startedAt,
            generatingAt: row.startedAt,
            phase: 'generating',
            statusText: 'Generating…',
          };
          merged.push(added);
          extra.push(added);
        }
        queueMicrotask(() => {
          for (const job of extra) pollJob(job.localId, job.taskId);
        });
        return merged;
      });
    });
  }, [pollJob]);

  const activeCount = useMemo(
    () => jobs.filter((job) => job.phase === 'uploading' || job.phase === 'generating').length,
    [jobs],
  );

  const value = useMemo(
    () => ({
      jobs,
      activeCount,
      startGeneration,
      dismissJob,
      markJobSeen,
      expanded,
      setExpanded,
    }),
    [jobs, activeCount, startGeneration, dismissJob, markJobSeen, expanded],
  );

  return (
    <GenerationJobsContext.Provider value={value}>
      {children}
      <GenerationJobsDock
        jobs={jobs}
        activeCount={activeCount}
        expanded={expanded}
        setExpanded={setExpanded}
        dismissJob={dismissJob}
        markJobSeen={markJobSeen}
      />
    </GenerationJobsContext.Provider>
  );
}
