import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomBytes } from 'crypto';
import { envValue } from '@/lib/env';
import { PRESET_MEDIA_BASE, PRESET_MEDIA_PREFIX } from '@/lib/presetMedia';

const DEFAULT_BUCKET = 'slutbotai';

function presetBucket(): string {
  return envValue('R2_PRESET_BUCKET') || DEFAULT_BUCKET;
}

function getClient() {
  const accountId = envValue('R2_ACCOUNT_ID');
  const accessKeyId = envValue('R2_ACCESS_KEY_ID');
  const secretAccessKey = envValue('R2_SECRET_ACCESS_KEY');
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('R2 credentials are not configured.');
  }
  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

export function isSampleUploadConfigured(): boolean {
  return Boolean(
    envValue('R2_ACCOUNT_ID') && envValue('R2_ACCESS_KEY_ID') && envValue('R2_SECRET_ACCESS_KEY'),
  );
}

function extensionFor(contentType: string, filename: string): string {
  const fromName = filename.split('.').pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName;
  if (contentType === 'image/jpeg') return 'jpg';
  if (contentType === 'image/png') return 'png';
  if (contentType === 'image/webp') return 'webp';
  if (contentType === 'video/mp4') return 'mp4';
  if (contentType === 'video/webm') return 'webm';
  return 'bin';
}

/** Upload a public marketing sample asset to the preset R2 bucket. */
export async function uploadSampleAsset(input: {
  buffer: Buffer;
  contentType: string;
  filename: string;
  folder?: 'examples' | 'before-after';
}): Promise<{ key: string; url: string }> {
  const folder = input.folder || 'examples';
  const ext = extensionFor(input.contentType, input.filename);
  const id = randomBytes(6).toString('hex');
  const key = `${PRESET_MEDIA_PREFIX}/samples/${folder}/${Date.now()}-${id}.${ext}`;
  const client = getClient();
  await client.send(
    new PutObjectCommand({
      Bucket: presetBucket(),
      Key: key,
      Body: input.buffer,
      ContentType: input.contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  );
  const base = PRESET_MEDIA_BASE.replace(/\/$/, '');
  return { key, url: `${base}/${key}` };
}
