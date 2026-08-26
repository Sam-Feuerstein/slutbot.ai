import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

import { envValue } from '@/lib/env';

const SHARED_EROGRAM_BUCKET = 'erogramimages';

export function r2UploadBucket(): string {
  const name = envValue('R2_UPLOAD_BUCKET') || envValue('R2_BUCKET_NAME');
  if (!name) {
    throw new Error('R2_UPLOAD_BUCKET or R2_BUCKET_NAME is required.');
  }
  if (name === SHARED_EROGRAM_BUCKET) {
    throw new Error('User uploads must not use the shared Erogram bucket. Set R2_UPLOAD_BUCKET.');
  }
  return name;
}

export function isR2Configured(): boolean {
  try {
    r2UploadBucket();
  } catch {
    return false;
  }
  return Boolean(envValue('R2_ACCOUNT_ID') && envValue('R2_ACCESS_KEY_ID') && envValue('R2_SECRET_ACCESS_KEY'));
}

function getR2Client() {
  const accountId = envValue('R2_ACCOUNT_ID');
  const accessKeyId = envValue('R2_ACCESS_KEY_ID');
  const secretAccessKey = envValue('R2_SECRET_ACCESS_KEY');
  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

export async function uploadToR2(buffer: Buffer, key: string, contentType: string): Promise<string> {
  const client = getR2Client();
  // R2 rejects S3 canned ACLs. Privacy is a private bucket + HMAC media proxy (no public object URLs).
  await client.send(
    new PutObjectCommand({
      Bucket: r2UploadBucket(),
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  );
  return key;
}

export async function getR2Object(key: string) {
  const client = getR2Client();
  return client.send(
    new GetObjectCommand({
      Bucket: r2UploadBucket(),
      Key: key,
    }),
  );
}
