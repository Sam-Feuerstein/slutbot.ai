'use server';

import { randomUUID } from 'crypto';
import { headers } from 'next/headers';
import mongoose from 'mongoose';
import connectDB from '@/lib/db/mongodb';
import { AiToolGeneration } from '@/lib/models';
import { userFromSession } from '@/lib/auth/requestUser';
import type { SlutbotAuthUser } from '@/lib/auth/slutbotAuth';
import { mergeVideoPrompts, resolveVideoEngine, VIDEO_CLOTHING_NEGATIVE } from '@/lib/generation/videoOptions';
import { getImagePrompt, getVideoPrompt } from '@/lib/generationSettings';
import type { VideoQuality } from '@/lib/generation/costs';
import {
  attachJobTaskId,
  claimJobForIngest,
  completeLockedJob,
  createChargedJob,
  findOwnedJobByTaskId,
  listActiveJobsForUser,
  markJobCompleted,
  refundChargedJob,
  revertJobToCharged,
} from '@/lib/generation/jobs';
import { refundIfWavespeedFailed } from '@/lib/generation/refundFailed';
import { resolveRequestCountry } from '@/lib/geo/tier1';
import { publicGenerationOutput } from '@/lib/media/generationUrl';
import { displayMediaUrl, isUserUploadKey, wavespeedFetchUrl } from '@/lib/media/sign';
import { uploadToR2, isR2Configured } from '@/lib/r2';
import { planGenerationCharge } from '@/lib/trial/plan';
import { accountTierForUser } from '@/lib/entitlements';
import { ingestLockedTrialVideo } from '@/lib/trial/ingest';
import { recordUserGeneration, reverseGenerationSpend, spendGenerationCredits, type CreditSource } from '@/lib/users/wallet';
import type { AiToolGenerationRecord, VideoModel } from '@/lib/imageToVideo/types';
import { envValue } from '@/lib/env';

function wavespeedApiKey() {
  return envValue('WAVESPEED_API_KEY');
}
const WAVESPEED_HOST = 'api.wavespeed.ai';
const WAN_ULTRA_FAST_SUBMIT_URL =
  'https://api.wavespeed.ai/api/v3/wavespeed-ai/wan-2.2/i2v-480p-ultra-fast';
const SEEDREAM_EDIT_URL = 'https://api.wavespeed.ai/api/v3/bytedance/seedream-v5.0-pro/edit';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];

/** Detect real image format from magic bytes; browser MIME is unreliable on mobile. */
function sniffImageType(buffer: Buffer): 'jpeg' | 'png' | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpeg';
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'png';
  }
  return null;
}

const CHEAP_DURATIONS = [5, 8] as const;
const TASK_ID_RE = /^[a-zA-Z0-9_-]{8,128}$/;

type ImageToVideoPollResult = {
  status: 'created' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'timeout' | 'unknown';
  outputUrl?: string;
  locked?: boolean;
  id?: string;
  archived?: boolean;
  error?: string;
  desires?: number;
};

function normalizeCheapDuration(value?: number): (typeof CHEAP_DURATIONS)[number] {
  const n = Math.round(Number(value));
  return n <= 6 ? 5 : 8;
}

type WavespeedTask = {
  id?: string;
  status?: string;
  outputs?: string[];
  urls?: { get?: string };
  error?: string;
};

function unwrapData<T extends Record<string, unknown>>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

function authHeaders(): HeadersInit {
  if (!wavespeedApiKey()) {
    throw new Error('WAVESPEED_API_KEY is not configured.');
  }
  return {
    Authorization: `Bearer ${wavespeedApiKey()}`,
    'Content-Type': 'application/json',
  };
}

function wavespeedResultUrl(taskId: string): string {
  if (!TASK_ID_RE.test(taskId)) {
    throw new Error('Invalid task id.');
  }
  return `https://${WAVESPEED_HOST}/api/v3/predictions/${taskId}/result`;
}

function assertWavespeedPollUrl(url: string) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || parsed.hostname !== WAVESPEED_HOST) {
    throw new Error('Invalid poll host.');
  }
  if (parsed.username || parsed.password || parsed.port) {
    throw new Error('Invalid poll host.');
  }
  if (!/^\/api\/v3\/predictions\/[a-zA-Z0-9_-]+\/result$/.test(parsed.pathname)) {
    throw new Error('Invalid poll path.');
  }
}

async function requireUser(): Promise<{ user: SlutbotAuthUser; error?: undefined } | { user?: undefined; error: string }> {
  const user = await userFromSession();
  if (!user) return { error: 'Sign in required.' };
  return { user };
}

export async function uploadImageToVideoSource(
  formData: FormData,
): Promise<{ key?: string; error?: string }> {
  const auth = await requireUser();
  if (!auth.user) return { error: auth.error || 'Sign in required.' };
  const file = formData.get('file') as File | null;
  if (!file) return { error: 'No image provided.' };

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  if (buffer.length > MAX_IMAGE_BYTES) {
    return { error: 'That image is too large. Please upload a photo under 10 MB.' };
  }

  // Trust the file bytes, not the browser-reported MIME. Mobile browsers send
  // HEIC, image/jpg, or an empty type; the client normalizes to JPEG but the
  // signature is the source of truth so a valid image is never rejected.
  const sniffed = sniffImageType(buffer);
  const declared = (file.type || '').toLowerCase();
  const isJpeg = sniffed === 'jpeg';
  const isPng = sniffed === 'png';
  if (!isJpeg && !isPng) {
    if (declared && !ALLOWED_IMAGE_TYPES.includes(declared)) {
      return { error: 'Use a JPG or PNG photo.' };
    }
    return { error: 'Could not read that image. Please try a JPG or PNG photo.' };
  }
  const contentType = isPng ? 'image/png' : 'image/jpeg';

  if (!isR2Configured()) {
    console.error('Image upload blocked: R2 storage is not configured (missing R2_UPLOAD_BUCKET / credentials).');
    return {
      error: 'Upload is temporarily unavailable. Please try again in a moment.',
    };
  }

  const ext = isPng ? 'png' : 'jpg';
  const key = `image-to-video/uploads/${randomUUID()}.${ext}`;
  await uploadToR2(buffer, key, contentType);
  return { key };
}

async function startWavespeedJob(input: {
  user: SlutbotAuthUser;
  mode: 'image' | 'video';
  sourceKey: string;
  cost: number;
  videoModel?: VideoModel;
  quality?: string;
  duration?: number | null;
  submitUrl: string;
  body: Record<string, unknown>;
  paidWith: CreditSource;
  lockVideo: boolean;
}): Promise<{ taskId?: string; desires?: number; error?: string }> {
  if (!wavespeedApiKey()) {
    return { error: 'WAVESPEED_API_KEY is not configured.' };
  }
  if (!isUserUploadKey(input.sourceKey)) {
    return { error: 'Invalid source image.' };
  }

  const spent = await spendGenerationCredits(input.user.id, input.cost, input.paidWith);
  if (!spent.ok) {
    return { error: 'Not enough Stars.', desires: spent.desires };
  }

  let job: { _id: mongoose.Types.ObjectId };
  try {
    job = await createChargedJob({
      userId: input.user.id,
      mode: input.mode,
      cost: spent.charged ? input.cost : 0,
      videoModel: input.videoModel,
      quality: input.quality,
      duration: input.duration,
      sourceKey: input.sourceKey,
      paidWith: input.paidWith,
      locked: input.lockVideo,
    });
  } catch (err) {
    console.error('createChargedJob failed:', err);
    if (spent.charged) {
      await reverseGenerationSpend(input.user.id, input.cost, input.paidWith);
    }
    return { error: 'Could not start generation.' };
  }

  try {
    const res = await fetch(input.submitUrl, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(input.body),
    });
    const raw = await res.json().catch(() => null);
    if (!res.ok) {
      const refunded = await refundChargedJob({ userId: input.user.id, jobId: String(job._id) });
      const message =
        (raw && typeof raw === 'object' && 'message' in raw && String(raw.message)) ||
        `WaveSpeed request failed (${res.status}).`;
      return { error: message, desires: refunded.desires ?? spent.desires };
    }

    const task = unwrapData<WavespeedTask>(raw);
    const taskId = task.id;
    if (!taskId || !TASK_ID_RE.test(taskId)) {
      const refunded = await refundChargedJob({ userId: input.user.id, jobId: String(job._id) });
      return { error: 'WaveSpeed did not return a task id.', desires: refunded.desires };
    }

    await attachJobTaskId(String(job._id), taskId);
    return { taskId, desires: spent.desires };
  } catch (err) {
    const refunded = await refundChargedJob({ userId: input.user.id, jobId: String(job._id) });
    return {
      error: err instanceof Error ? err.message : 'Submit failed.',
      desires: refunded.desires,
    };
  }
}

export async function submitWavespeedImageToVideo(
  sourceKey: string,
  userPrompt?: string,
  _resolution?: string,
  duration?: number,
  _preset?: string,
  _videoModel: VideoModel = 'current',
): Promise<{ taskId?: string; desires?: number; error?: string }> {
  const auth = await requireUser();
  if (!auth.user) return { error: auth.error || 'Sign in required.' };

  const requestedQuality: VideoQuality = '480p';
  const normalizedDuration = normalizeCheapDuration(duration);
  const { videoModel } = resolveVideoEngine(normalizedDuration, requestedQuality);
  const plan = await planGenerationCharge({
    userId: auth.user.id,
    email: auth.user.email,
    mode: 'video',
    videoModel,
    quality: requestedQuality,
    duration: normalizedDuration,
    currentCountry: resolveRequestCountry(await headers()),
  });
  if (plan.error) {
    return { error: 'Not enough Stars.', desires: plan.spendable };
  }

  const quality = plan.quality as VideoQuality;
  const tier = await accountTierForUser({
    userId: auth.user.id,
    email: auth.user.email,
    desires: auth.user.desires,
  });
  const allowedPrompt = tier === 'ultra' ? userPrompt : undefined;
  const trimmedPrompt = mergeVideoPrompts(await getVideoPrompt(), allowedPrompt);
  const image = await wavespeedFetchUrl(sourceKey.trim());
  const submitUrl = WAN_ULTRA_FAST_SUBMIT_URL;
  const body = {
    image,
    prompt: trimmedPrompt,
    negative_prompt: VIDEO_CLOTHING_NEGATIVE,
    duration: normalizedDuration,
    seed: -1,
  };

  return startWavespeedJob({
    user: auth.user,
    mode: 'video',
    sourceKey: sourceKey.trim(),
    cost: plan.cost,
    videoModel,
    quality,
    duration: normalizedDuration,
    submitUrl,
    body,
    paidWith: plan.paidWith,
    lockVideo: plan.lockVideo,
  });
}

export async function submitWavespeedImageEdit(
  sourceKey: string,
): Promise<{ taskId?: string; desires?: number; error?: string }> {
  const auth = await requireUser();
  if (!auth.user) return { error: auth.error || 'Sign in required.' };

  const plan = await planGenerationCharge({
    userId: auth.user.id,
    email: auth.user.email,
    mode: 'image',
    videoModel: 'current',
    quality: '480p',
    currentCountry: resolveRequestCountry(await headers()),
  });
  if (plan.error) {
    return { error: 'Not enough Stars.', desires: plan.spendable };
  }

  const trimmedPrompt = await getImagePrompt();
  const image = await wavespeedFetchUrl(sourceKey.trim());

  return startWavespeedJob({
    user: auth.user,
    mode: 'image',
    sourceKey: sourceKey.trim(),
    cost: plan.cost,
    submitUrl: SEEDREAM_EDIT_URL,
    body: {
      prompt: trimmedPrompt,
      images: [image],
      resolution: '1k',
      output_format: 'jpeg',
      prompt_optimization_mode: 'fast',
    },
    paidWith: plan.paidWith,
    lockVideo: false,
  });
}

export async function refundFailedGeneration(
  taskId: string,
): Promise<{ ok: boolean; desires?: number; error?: string }> {
  const auth = await requireUser();
  if (!auth.user) return { ok: false, error: auth.error || 'Sign in required.' };
  return refundIfWavespeedFailed(auth.user.id, taskId);
}

function ownedArchiveFilter(userId: string, _clientId: string) {
  // SECURITY: match ONLY the signed-in account. Never fall back to clientId.
  // Never pass an empty/undefined userId — Mongoose strips undefined and would
  // return ALL generations (cross-user privacy leak).
  void _clientId;
  const id = String(userId || '').trim();
  if (!id) return { _id: null };
  return { userId: id };
}

/** Emergency: set ARCHIVE_KILL_SWITCH=1 to serve zero archive items site-wide. */
function archiveKillSwitchOn(): boolean {
  const raw = (process.env.ARCHIVE_KILL_SWITCH || '').trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on';
}

/** Archive stays OFF until ARCHIVE_ENABLED=1 after a privacy audit. Default = disabled. */
function archiveListingEnabled(): boolean {
  const raw = (process.env.ARCHIVE_ENABLED || '').trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on';
}

export async function saveAiToolGeneration(input: {
  mode: 'image' | 'video';
  videoModel?: VideoModel | null;
  sourceKey: string;
  outputUrl: string;
  quality?: string;
  duration?: number | null;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const auth = await requireUser();
  if (!auth.user) return { ok: false, error: auth.error || 'Sign in required.' };
  if (!isUserUploadKey(input.sourceKey) || !input.outputUrl?.trim()) {
    return { ok: false, error: 'Missing output.' };
  }

  try {
    await connectDB();
    const doc = await AiToolGeneration.create({
      clientId: auth.user.clientId,
      userId: auth.user.id,
      mode: input.mode,
      videoModel: input.mode === 'video' ? input.videoModel || 'current' : null,
      sourceImageUrl: input.sourceKey.trim(),
      outputUrl: input.outputUrl.trim(),
      prompt: '',
      quality: (input.quality || '').trim(),
      duration: input.duration ?? null,
    });
    return { ok: true, id: String(doc._id) };
  } catch {
    return { ok: false, error: 'Could not save generation.' };
  }
}

export async function deleteAiToolGeneration(id: string): Promise<{ ok: boolean; error?: string }> {
  const auth = await requireUser();
  if (!auth.user) return { ok: false, error: auth.error || 'Sign in required.' };
  const trimmedId = id?.trim();
  if (!trimmedId) return { ok: false, error: 'Missing id.' };

  try {
    await connectDB();
    const result = await AiToolGeneration.deleteOne({
      _id: trimmedId,
      ...ownedArchiveFilter(auth.user.id, auth.user.clientId),
    });
    if (!result.deletedCount) return { ok: false, error: 'Could not delete.' };
    return { ok: true };
  } catch {
    return { ok: false, error: 'Could not delete generation.' };
  }
}

async function listOwnedGenerations(user: SlutbotAuthUser): Promise<{
  items: AiToolGenerationRecord[];
  error?: string;
}> {
  const userId = String(user.id || '').trim();
  if (!userId) {
    return { items: [], error: 'Sign in required.' };
  }

  try {
    await connectDB();
    const docs = await AiToolGeneration.find(ownedArchiveFilter(userId, user.clientId))
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const items: AiToolGenerationRecord[] = docs.map((doc) => {
      const visible = publicGenerationOutput({
        locked: Boolean(doc.locked),
        outputKey: String(doc.outputKey || ''),
        previewKey: String(doc.previewKey || ''),
        outputUrl: String(doc.outputUrl || ''),
      });
      return {
        id: String(doc._id),
        mode: doc.mode as 'image' | 'video',
        videoModel: (doc.videoModel as VideoModel | null) || null,
        sourceImageUrl: displayMediaUrl(String(doc.sourceImageUrl || '')),
        outputUrl: visible.outputUrl,
        locked: visible.locked,
        prompt: String(doc.prompt || ''),
        quality: String(doc.quality || ''),
        duration: typeof doc.duration === 'number' ? doc.duration : null,
        createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
      };
    });

    return { items };
  } catch {
    return { items: [], error: 'Could not load archive.' };
  }
}

async function listOwnedGenerationsFromSession(): Promise<{
  items: AiToolGenerationRecord[];
  error?: string;
}> {
  const auth = await requireUser();
  if (!auth.user) return { items: [], error: auth.error || 'Sign in required.' };
  return listOwnedGenerations(auth.user);
}

export async function listAiToolGenerations(): Promise<{
  items: AiToolGenerationRecord[];
  error?: string;
}> {
  // HARD LOCK — no account may list archive items until ARCHIVE_ENABLED=1 after privacy audit.
  if (true || !archiveListingEnabled() || archiveKillSwitchOn()) {
    return { items: [], error: 'Collection temporarily unavailable.' };
  }

  return listOwnedGenerationsFromSession();
}

export type ActiveGenerationJobClient = {
  taskId: string;
  mode: 'image' | 'video';
  videoModel: VideoModel | null;
  quality: string;
  duration: number | null;
  sourceKey: string;
  sourceUrl: string;
  startedAt: number;
};

export async function listActiveGenerationJobs(): Promise<{ jobs: ActiveGenerationJobClient[] }> {
  const auth = await requireUser();
  if (!auth.user) return { jobs: [] };

  try {
    const rows = await listActiveJobsForUser(auth.user.id);
    return {
      jobs: rows.map((row) => ({
        taskId: row.taskId,
        mode: row.mode,
        videoModel: row.videoModel,
        quality: row.quality,
        duration: row.duration,
        sourceKey: row.sourceKey,
        sourceUrl: row.sourceKey ? displayMediaUrl(row.sourceKey) : '',
        startedAt: row.createdAt.getTime(),
      })),
    };
  } catch {
    return { jobs: [] };
  }
}

function jobLocksVideo(job: { mode?: string; locked?: boolean }): boolean {
  return job.mode === 'video' && Boolean(job.locked);
}

function lockedJobClientResult(job: { previewKey?: string; generationId?: string }): ImageToVideoPollResult {
  const previewKey = String(job.previewKey || '');
  return {
    status: 'completed',
    outputUrl: previewKey ? displayMediaUrl(previewKey) : '',
    locked: true,
    id: job.generationId || undefined,
    archived: Boolean(job.generationId),
  };
}

export async function pollWavespeedImageToVideo(taskId: string): Promise<ImageToVideoPollResult> {
  const auth = await requireUser();
  if (!auth.user) return { status: 'failed', error: auth.error || 'Sign in required.' };
  if (!wavespeedApiKey()) {
    return { status: 'failed', error: 'WAVESPEED_API_KEY is not configured.' };
  }

  const trimmed = taskId?.trim();
  if (!trimmed || !TASK_ID_RE.test(trimmed)) {
    return { status: 'failed', error: 'Missing task id.' };
  }

  const job = await findOwnedJobByTaskId(auth.user.id, trimmed);
  if (!job) return { status: 'failed', error: 'Unknown job.' };
  if (job.status === 'refunded') {
    return { status: 'failed', error: 'Job was refunded.' };
  }
  if (job.status === 'completed' && jobLocksVideo(job)) {
    return lockedJobClientResult(job);
  }
  if (job.status !== 'charged' && job.status !== 'completed' && job.status !== 'ingesting') {
    return { status: 'failed', error: 'Job is not active.' };
  }

  let pollUrl: string;
  try {
    pollUrl = wavespeedResultUrl(trimmed);
    assertWavespeedPollUrl(pollUrl);
  } catch {
    return { status: 'failed', error: 'Invalid task id.' };
  }

  const res = await fetch(pollUrl, {
    method: 'GET',
    headers: { Authorization: `Bearer ${wavespeedApiKey()}` },
    cache: 'no-store',
  });

  const raw = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      (raw && typeof raw === 'object' && 'message' in raw && String(raw.message)) ||
      `WaveSpeed poll failed (${res.status}).`;
    return { status: 'failed', error: message };
  }

  const task = unwrapData<WavespeedTask>(raw);
  const status = (task.status || 'unknown') as ImageToVideoPollResult['status'];

  if (status === 'completed') {
    const outputUrl = task.outputs?.[0];
    if (!outputUrl) return { status: 'failed', error: 'Task completed but no output URL was returned.' };

    if (jobLocksVideo(job)) {
      if (job.status === 'ingesting') {
        const claimed = await claimJobForIngest(String(job._id));
        if (!claimed) return { status: 'processing' };
      } else if (job.status === 'charged') {
        const claimed = await claimJobForIngest(String(job._id));
        if (!claimed) {
          const latest = await findOwnedJobByTaskId(auth.user.id, trimmed);
          if (latest?.status === 'completed') return lockedJobClientResult(latest);
          return { status: 'processing' };
        }
      } else if (job.status === 'completed') {
        return lockedJobClientResult(job);
      }

      try {
        const ingested = await ingestLockedTrialVideo(outputUrl, auth.user.id);
        const doc = await AiToolGeneration.create({
          clientId: auth.user.clientId,
          userId: auth.user.id,
          mode: 'video',
          videoModel: job.videoModel || 'current',
          sourceImageUrl: job.sourceKey,
          outputUrl: ingested.previewKey ? `r2:${ingested.previewKey}` : '',
          outputKey: ingested.outputKey,
          previewKey: ingested.previewKey,
          locked: true,
          paidWith: 'trial',
          prompt: '',
          quality: job.quality || '',
          duration: typeof job.duration === 'number' ? job.duration : null,
        });
        await completeLockedJob(String(job._id), {
          outputKey: ingested.outputKey,
          previewKey: ingested.previewKey,
          generationId: String(doc._id),
        });
        await recordUserGeneration(auth.user.id, 'video');
        return {
          status: 'completed',
          outputUrl: ingested.previewKey ? displayMediaUrl(ingested.previewKey) : '',
          locked: true,
          id: String(doc._id),
          archived: true,
        };
      } catch (err) {
        console.error('Could not lock trial video; original was not sent to the client.', err);
        await revertJobToCharged(String(job._id));
        return { status: 'processing' };
      }
    }

    if (job.status === 'charged') {
      await markJobCompleted(String(job._id));
      await recordUserGeneration(auth.user.id, job.mode === 'image' ? 'image' : 'video');
    }
    return { status, outputUrl, locked: false };
  }

  if (status === 'failed' || status === 'cancelled' || status === 'timeout') {
    const refunded = await refundChargedJob({ userId: auth.user.id, taskId: trimmed });
    return {
      status,
      error: task.error || 'Generation failed.',
      desires: refunded.desires,
    };
  }

  return { status };
}
