import { randomUUID } from 'crypto';
import { USER_UPLOAD_PREFIX } from '@/lib/media/sign';
import { isR2Configured, uploadToR2 } from '@/lib/r2';
import { blurTrialVideo } from '@/lib/trial/blur';

const MAX_VIDEO_BYTES = 40 * 1024 * 1024;

function isPrivateHostname(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) return true;
  if (host === '::1' || host === '0.0.0.0') return true;
  if (/^(127|10)\./.test(host)) return true;
  if (/^192\.168\./.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return true;
  if (host.endsWith('.localhost')) return true;
  return false;
}

async function downloadHttpsBuffer(url: string): Promise<Buffer> {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password) {
    throw new Error('Invalid output.');
  }
  if (isPrivateHostname(parsed.hostname)) {
    throw new Error('Invalid output.');
  }

  const res = await fetch(url, { redirect: 'follow', cache: 'no-store' });
  if (!res.ok) throw new Error('Could not fetch output.');
  const buf = Buffer.from(await res.arrayBuffer());
  if (!buf.length) throw new Error('Empty output.');
  if (buf.length > MAX_VIDEO_BYTES) throw new Error('Output too large.');
  return buf;
}

export type IngestedTrialVideo = {
  outputKey: string;
  previewKey: string;
};

/**
 * Pull the WaveSpeed file server-side, store the original privately, and upload
 * only a blurred preview. Callers must never send the source URL to the client.
 */
export async function ingestLockedTrialVideo(sourceUrl: string, userId: string): Promise<IngestedTrialVideo> {
  if (!isR2Configured()) {
    throw new Error('Image storage is not configured.');
  }

  const original = await downloadHttpsBuffer(sourceUrl);
  const id = randomUUID();
  const outputKey = `${USER_UPLOAD_PREFIX}outputs/${userId}/${id}.mp4`;
  await uploadToR2(original, outputKey, 'video/mp4');

  let previewKey = '';
  try {
    const preview = await blurTrialVideo(original);
    previewKey = `${USER_UPLOAD_PREFIX}previews/${userId}/${id}.mp4`;
    await uploadToR2(preview, previewKey, 'video/mp4');
  } catch (err) {
    console.error('Trial video blur failed; original stays private.', err);
  }

  return { outputKey, previewKey };
}

export function isOriginalOutputKey(key: string): boolean {
  return key.startsWith(`${USER_UPLOAD_PREFIX}outputs/`) && !key.includes('..');
}
