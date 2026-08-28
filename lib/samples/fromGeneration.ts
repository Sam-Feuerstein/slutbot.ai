import { Types } from 'mongoose';
import connectDB from '@/lib/db/mongodb';
import { AiToolGeneration } from '@/lib/models';
import { isUserUploadKey } from '@/lib/media/sign';
import { getR2Object } from '@/lib/r2';
import { upsertSample } from './store';
import { isSampleUploadConfigured, uploadSampleAsset } from './upload';
import type { SampleRecord } from './types';

const MAX_BYTES = 45 * 1024 * 1024;

function clip(value: unknown, max = 240): string {
  return String(value ?? '')
    .trim()
    .slice(0, max);
}

function resolveR2Key(stored: string): string | null {
  const trimmed = stored.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('r2:')) {
    const key = trimmed.slice(3);
    return isUserUploadKey(key) ? key : null;
  }
  return isUserUploadKey(trimmed) ? trimmed : null;
}

function isPrivateHostname(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) return true;
  if (host === '::1' || host === '0.0.0.0') return true;
  if (/^(127|10)\./.test(host)) return true;
  if (/^192\.168\./.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return true;
  return false;
}

async function downloadHttpsBuffer(url: string): Promise<{ buffer: Buffer; contentType: string }> {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password) {
    throw new Error('Invalid output URL.');
  }
  if (isPrivateHostname(parsed.hostname)) {
    throw new Error('Invalid output URL.');
  }
  const res = await fetch(url, { redirect: 'follow', cache: 'no-store' });
  if (!res.ok) throw new Error('Could not fetch generation output.');
  const buffer = Buffer.from(await res.arrayBuffer());
  if (!buffer.length) throw new Error('Empty generation output.');
  if (buffer.length > MAX_BYTES) throw new Error('Generation output is too large.');
  const contentType = res.headers.get('content-type') || 'application/octet-stream';
  return { buffer, contentType };
}

async function readR2Key(key: string): Promise<{ buffer: Buffer; contentType: string }> {
  const res = await getR2Object(key);
  const body = res.Body;
  if (!body) throw new Error('Could not read stored file.');
  const buffer = Buffer.from(await body.transformToByteArray());
  if (!buffer.length) throw new Error('Empty stored file.');
  if (buffer.length > MAX_BYTES) throw new Error('Stored file is too large.');
  return { buffer, contentType: res.ContentType || 'application/octet-stream' };
}

async function bytesForStored(stored: string, preferKey?: string): Promise<{ buffer: Buffer; contentType: string }> {
  const key = clip(preferKey || '') || resolveR2Key(stored);
  if (key) return readR2Key(key);
  const url = stored.trim();
  if (url.startsWith('https://')) return downloadHttpsBuffer(url);
  throw new Error('Generation asset is missing or not readable.');
}

function filenameFor(contentType: string, fallbackExt: string): string {
  if (contentType.includes('jpeg')) return `asset.jpg`;
  if (contentType.includes('png')) return `asset.png`;
  if (contentType.includes('webp')) return `asset.webp`;
  if (contentType.includes('webm')) return `asset.webm`;
  if (contentType.includes('mp4')) return `asset.mp4`;
  return `asset.${fallbackExt}`;
}

/** Copy a generator output into the public sample bucket and create an example card. */
export async function promoteGenerationToSample(
  generationId: string,
  title?: string,
): Promise<SampleRecord> {
  if (!isSampleUploadConfigured()) {
    throw new Error('Sample uploads are not configured (R2).');
  }

  const trimmed = clip(generationId, 80);
  if (!trimmed || !Types.ObjectId.isValid(trimmed)) {
    throw new Error('Invalid generation id.');
  }

  await connectDB();
  const doc = (await AiToolGeneration.findById(trimmed).lean()) as {
    mode?: string;
    sourceImageUrl?: string;
    outputKey?: string;
    outputUrl?: string;
    quality?: string;
    createdAt?: Date;
  } | null;
  if (!doc) throw new Error('Generation not found.');

  const mode = doc.mode === 'video' ? 'video' : 'image';
  const sourceKey = resolveR2Key(String(doc.sourceImageUrl || ''));
  if (!sourceKey) throw new Error('Generation source image is missing.');

  const outputKey = clip(String(doc.outputKey || ''));
  const outputUrl = clip(String(doc.outputUrl || ''), 500);
  const outputStored = outputKey || outputUrl;
  if (!outputStored) throw new Error('Generation output is missing.');

  const sourceBytes = await readR2Key(sourceKey);
  const sourceUpload = await uploadSampleAsset({
    buffer: sourceBytes.buffer,
    contentType: sourceBytes.contentType || 'image/jpeg',
    filename: filenameFor(sourceBytes.contentType || '', 'jpg'),
    folder: 'examples',
  });

  let posterUrl = sourceUpload.url;
  let videoUrl = '';
  let sourceUrl = sourceUpload.url;

  if (mode === 'video') {
    const videoBytes = await bytesForStored(outputStored, outputKey);
    const videoUpload = await uploadSampleAsset({
      buffer: videoBytes.buffer,
      contentType: videoBytes.contentType || 'video/mp4',
      filename: filenameFor(videoBytes.contentType || '', 'mp4'),
      folder: 'examples',
    });
    videoUrl = videoUpload.url;
  } else {
    const imageBytes = await bytesForStored(outputStored, outputKey);
    const imageUpload = await uploadSampleAsset({
      buffer: imageBytes.buffer,
      contentType: imageBytes.contentType || 'image/jpeg',
      filename: filenameFor(imageBytes.contentType || '', 'jpg'),
      folder: 'examples',
    });
    posterUrl = imageUpload.url;
    sourceUrl = '';
  }

  const label =
    clip(title, 80) ||
    `Generator ${mode}${doc.quality ? ` · ${clip(doc.quality, 16)}` : ''} · ${new Date(
      doc.createdAt || Date.now(),
    ).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

  const sampleId = `gen-${trimmed.slice(-10)}`;

  return upsertSample({
    id: sampleId,
    kind: 'example',
    title: label,
    posterUrl,
    videoUrl,
    sourceUrl: mode === 'video' ? sourceUrl : '',
    enabled: true,
    pinned: false,
  });
}
