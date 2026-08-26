import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const SHARED_EROGRAM_BUCKET = 'erogramimages';

export function r2UploadBucket(): string {
  const name = (process.env.R2_UPLOAD_BUCKET || process.env.R2_BUCKET_NAME || '').trim();
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
  return Boolean(
    process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY,
  );
}

function getR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID!;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID!;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY!;
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
