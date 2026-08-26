import { findOwnedJobByTaskId, refundChargedJob } from '@/lib/generation/jobs';
import { getUserDesires } from '@/lib/users/wallet';

const WAVESPEED_API_KEY = process.env.WAVESPEED_API_KEY;
const WAVESPEED_HOST = 'api.wavespeed.ai';
const TASK_ID_RE = /^[a-zA-Z0-9_-]{8,128}$/;
const FAILED_WAVESPEED_STATUSES = new Set(['failed', 'cancelled', 'timeout']);

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

async function wavespeedTaskStatus(taskId: string): Promise<string | null> {
  if (!WAVESPEED_API_KEY) return null;
  const pollUrl = wavespeedResultUrl(taskId);
  assertWavespeedPollUrl(pollUrl);
  const res = await fetch(pollUrl, {
    method: 'GET',
    headers: { Authorization: `Bearer ${WAVESPEED_API_KEY}` },
    cache: 'no-store',
  });
  const raw = (await res.json().catch(() => null)) as
    | { data?: { status?: string }; status?: string }
    | null;
  if (!res.ok) return null;
  const status = raw && typeof raw === 'object' && 'data' in raw ? raw.data?.status : raw?.status;
  return (status || '').toLowerCase() || null;
}

/** Refund only after WaveSpeed reports the job failed. Never mints an arbitrary amount. */
export async function refundIfWavespeedFailed(
  userId: string,
  taskId: string,
): Promise<{ ok: boolean; desires?: number; error?: string }> {
  const trimmed = taskId?.trim();
  if (!trimmed || !TASK_ID_RE.test(trimmed)) return { ok: false, error: 'Missing job.' };

  const job = await findOwnedJobByTaskId(userId, trimmed);
  if (!job) return { ok: false, error: 'Unknown job.' };
  if (job.status === 'refunded') {
    return { ok: true, desires: await getUserDesires(userId) };
  }
  if (job.status !== 'charged') return { ok: false, error: 'Job is not refundable.' };

  let status: string | null = null;
  try {
    status = await wavespeedTaskStatus(trimmed);
  } catch {
    status = null;
  }
  if (!status || !FAILED_WAVESPEED_STATUSES.has(status)) {
    return { ok: false, error: 'Refund is only allowed for a failed job.' };
  }

  return refundChargedJob({ userId, taskId: trimmed });
}
