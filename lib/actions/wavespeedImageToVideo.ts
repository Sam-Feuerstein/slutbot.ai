'use server';

import { randomUUID } from 'crypto';
import mongoose from 'mongoose';
import connectDB from '@/lib/db/mongodb';
import { AiToolGeneration } from '@/lib/models';
import { ADMIN_INFINITE_DESIRES, isAdminAppUserEmail } from '@/lib/auth/adminUser';
import { userFromSession } from '@/lib/auth/requestUser';
import type { SlutbotAuthUser } from '@/lib/auth/slutbotAuth';
import { getImagePrompt, getVideoEngine, getVideoPrompt } from '@/lib/generationSettings';
import {
  attachJobTaskId,
  createChargedJob,
  findOwnedJobByTaskId,
  markJobCompleted,
  refundChargedJob,
} from '@/lib/generation/jobs';
import { refundIfWavespeedFailed } from '@/lib/generation/refundFailed';
import { getGenerationDesireCost } from '@/lib/generation/costs';
import { displayMediaUrl, isUserUploadKey, wavespeedFetchUrl } from '@/lib/media/sign';
import { uploadToR2, isR2Configured } from '@/lib/r2';
import { adjustUserDesires, recordUserGeneration, spendUserDesires } from '@/lib/users/wallet';
import type { AiToolGenerationRecord, VideoModel } from '@/lib/imageToVideo/types';
import { envValue } from '@/lib/env';

function wavespeedApiKey() {
  return envValue('WAVESPEED_API_KEY');
}
const WAVESPEED_HOST = 'api.wavespeed.ai';
const LTX_SPICY_SUBMIT_URL =
  'https://api.wavespeed.ai/api/v3/wavespeed-ai/ltx-2.3-spicy/image-to-video';
const WAN_ULTRA_FAST_SUBMIT_URL =
  'https://api.wavespeed.ai/api/v3/wavespeed-ai/wan-2.2/i2v-480p-ultra-fast';
const SEEDREAM_EDIT_URL = 'https://api.wavespeed.ai/api/v3/bytedance/seedream-v5.0-pro/edit';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];

const ALLOWED_RESOLUTIONS = ['480p', '720p', '1080p'] as const;
const MIN_DURATION = 3;
const MAX_DURATION = 20;
const DEFAULT_RESOLUTION = '480p';
const DEFAULT_DURATION = 5;

const CHEAP_DURATIONS = [5] as const;
const TASK_ID_RE = /^[a-zA-Z0-9_-]{8,128}$/;

type ImageToVideoResolution = (typeof ALLOWED_RESOLUTIONS)[number];

type ImageToVideoPollResult = {
  status: 'created' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'timeout' | 'unknown';
  outputUrl?: string;
  error?: string;
  desires?: number;
};

function normalizeResolution(value?: string): ImageToVideoResolution {
  return ALLOWED_RESOLUTIONS.includes(value as ImageToVideoResolution)
    ? (value as ImageToVideoResolution)
    : DEFAULT_RESOLUTION;
}

function normalizeDuration(value?: number): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return DEFAULT_DURATION;
  return Math.min(MAX_DURATION, Math.max(MIN_DURATION, n));
}

function normalizeCheapDuration(value?: number): (typeof CHEAP_DURATIONS)[number] {
  const n = Math.round(Number(value));
  return CHEAP_DURATIONS.includes(n as (typeof CHEAP_DURATIONS)[number])
    ? (n as (typeof CHEAP_DURATIONS)[number])
    : 5;
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

async function requireUser(): Promise<{ user?: SlutbotAuthUser; error?: string }> {
  const user = await userFromSession();
  if (!user) return { error: 'Sign in required.' };
  return { user };
}

async function chargeGeneration(user: SlutbotAuthUser, cost: number) {
  if (isAdminAppUserEmail(user.email)) {
    return { ok: true as const, desires: ADMIN_INFINITE_DESIRES, charged: false };
  }
  const spent = await spendUserDesires(user.id, cost);
  return { ok: spent.ok, desires: spent.desires, charged: spent.ok };
}

export async function uploadImageToVideoSource(
  formData: FormData,
): Promise<{ key?: string; error?: string }> {
  const auth = await requireUser();
  if (auth.error || !auth.user) return { error: auth.error || 'Sign in required.' };
  const file = formData.get('file') as File | null;
  if (!file) return { error: 'No image provided.' };
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { error: 'Use JPG or PNG. WEBP is not supported by the model.' };
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  if (buffer.length > MAX_IMAGE_BYTES) return { error: 'Image too large. Max 10 MB.' };

  if (!isR2Configured()) {
    return {
      error: 'Image storage is not configured. Set R2 credentials and R2_UPLOAD_BUCKET.',
    };
  }

  const ext = file.type === 'image/png' ? 'png' : 'jpg';
  const key = `image-to-video/uploads/${randomUUID()}.${ext}`;
  await uploadToR2(buffer, key, file.type);
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
}): Promise<{ taskId?: string; desires?: number; error?: string }> {
  if (!wavespeedApiKey()) {
    return { error: 'WAVESPEED_API_KEY is not configured.' };
  }
  if (!isUserUploadKey(input.sourceKey)) {
    return { error: 'Invalid source image.' };
  }

  const spent = await chargeGeneration(input.user, input.cost);
  if (!spent.ok) {
    return { error: 'Not enough Slutcoins.', desires: spent.desires };
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
    });
  } catch {
    if (spent.charged) {
      await adjustUserDesires(input.user.id, input.cost);
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
      await refundChargedJob({ userId: input.user.id, jobId: String(job._id) });
      const message =
        (raw && typeof raw === 'object' && 'message' in raw && String(raw.message)) ||
        `WaveSpeed request failed (${res.status}).`;
      return { error: message, desires: spent.charged ? spent.desires + input.cost : spent.desires };
    }

    const task = unwrapData<WavespeedTask>(raw);
    const taskId = task.id;
    if (!taskId || !TASK_ID_RE.test(taskId)) {
      await refundChargedJob({ userId: input.user.id, jobId: String(job._id) });
      return { error: 'WaveSpeed did not return a task id.' };
    }

    await attachJobTaskId(String(job._id), taskId);
    return { taskId, desires: spent.desires };
  } catch (err) {
    await refundChargedJob({ userId: input.user.id, jobId: String(job._id) });
    return { error: err instanceof Error ? err.message : 'Submit failed.' };
  }
}

export async function submitWavespeedImageToVideo(
  sourceKey: string,
  _prompt?: string,
  resolution?: string,
  duration?: number,
  preset?: string,
  _videoModel: VideoModel = 'current',
): Promise<{ taskId?: string; desires?: number; error?: string }> {
  const auth = await requireUser();
  if (auth.error || !auth.user) return { error: auth.error || 'Sign in required.' };

  // Admin-selected WaveSpeed engine wins over the public quality picker.
  const engine = await getVideoEngine();
  const videoModel: VideoModel = engine === 'wan_ultra_fast' ? 'cheap' : 'current';
  const quality = engine === 'wan_ultra_fast' ? '480p' : normalizeResolution(resolution);
  const normalizedDuration =
    videoModel === 'cheap' ? normalizeCheapDuration(duration) : normalizeDuration(duration);
  const cost = getGenerationDesireCost('video', videoModel, quality);
  const trimmedPrompt = await getVideoPrompt();
  const image = wavespeedFetchUrl(sourceKey.trim());
  const submitUrl = engine === 'wan_ultra_fast' ? WAN_ULTRA_FAST_SUBMIT_URL : LTX_SPICY_SUBMIT_URL;
  const body =
    engine === 'wan_ultra_fast'
      ? {
          image,
          prompt: trimmedPrompt,
          duration: normalizedDuration,
          seed: -1,
        }
      : {
          image,
          prompt: trimmedPrompt,
          preset: preset === 'original' ? 'original' : 'tuned',
          resolution: quality,
          duration: normalizedDuration,
          seed: -1,
        };

  return startWavespeedJob({
    user: auth.user,
    mode: 'video',
    sourceKey: sourceKey.trim(),
    cost,
    videoModel,
    quality,
    duration: normalizedDuration,
    submitUrl,
    body,
  });
}

export async function submitWavespeedImageEdit(
  sourceKey: string,
): Promise<{ taskId?: string; desires?: number; error?: string }> {
  const auth = await requireUser();
  if (auth.error || !auth.user) return { error: auth.error || 'Sign in required.' };

  const cost = getGenerationDesireCost('image');
  const trimmedPrompt = await getImagePrompt();
  const image = wavespeedFetchUrl(sourceKey.trim());

  return startWavespeedJob({
    user: auth.user,
    mode: 'image',
    sourceKey: sourceKey.trim(),
    cost,
    submitUrl: SEEDREAM_EDIT_URL,
    body: {
      prompt: trimmedPrompt,
      images: [image],
      resolution: '1k',
      output_format: 'jpeg',
      prompt_optimization_mode: 'fast',
    },
  });
}

export async function refundFailedGeneration(
  taskId: string,
): Promise<{ ok: boolean; desires?: number; error?: string }> {
  const auth = await requireUser();
  if (auth.error || !auth.user) return { ok: false, error: auth.error || 'Sign in required.' };
  return refundIfWavespeedFailed(auth.user.id, taskId);
}

function ownedArchiveFilter(userId: string, clientId: string) {
  return {
    $or: [{ userId }, { userId: null, clientId }],
  };
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
  if (auth.error || !auth.user) return { ok: false, error: auth.error || 'Sign in required.' };
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
  if (auth.error || !auth.user) return { ok: false, error: auth.error || 'Sign in required.' };
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

export async function listAiToolGenerations(): Promise<{
  items: AiToolGenerationRecord[];
  error?: string;
}> {
  const auth = await requireUser();
  if (auth.error || !auth.user) return { items: [], error: auth.error || 'Sign in required.' };

  try {
    await connectDB();
    const docs = await AiToolGeneration.find(ownedArchiveFilter(auth.user.id, auth.user.clientId))
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const items: AiToolGenerationRecord[] = docs.map((doc) => ({
      id: String(doc._id),
      mode: doc.mode as 'image' | 'video',
      videoModel: (doc.videoModel as VideoModel | null) || null,
      sourceImageUrl: displayMediaUrl(String(doc.sourceImageUrl || '')),
      outputUrl: String(doc.outputUrl || ''),
      prompt: String(doc.prompt || ''),
      quality: String(doc.quality || ''),
      duration: typeof doc.duration === 'number' ? doc.duration : null,
      createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
    }));

    return { items };
  } catch {
    return { items: [], error: 'Could not load archive.' };
  }
}

export async function pollWavespeedImageToVideo(taskId: string): Promise<ImageToVideoPollResult> {
  const auth = await requireUser();
  if (auth.error || !auth.user) return { status: 'failed', error: auth.error || 'Sign in required.' };
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
  if (job.status !== 'charged' && job.status !== 'completed') {
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
    if (job.status === 'charged') {
      await markJobCompleted(String(job._id));
      await recordUserGeneration(auth.user.id, job.mode === 'image' ? 'image' : 'video');
    }
    return { status, outputUrl };
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
