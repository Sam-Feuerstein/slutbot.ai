/**
 * Move example media from `slutbot.ai/examples/...` to the bucket root on R2.
 *
 *   slutbot.ai/examples/example-ex-1.jpg          -> example-ex-1.jpg
 *   slutbot.ai/examples/before-after/pair-01.jpg  -> before-after/pair-01.jpg
 *
 * This matches exampleMediaUrl() after the update (serves from the bucket root).
 * R2/S3 has no native move, so this copies then deletes the source key.
 *
 * Usage:
 *   node --env-file=.env.local scripts/move-examples-to-r2-root.mjs --dry-run
 *   node --env-file=.env.local scripts/move-examples-to-r2-root.mjs
 *   node --env-file=.env.local scripts/move-examples-to-r2-root.mjs --keep-source  # copy only, don't delete
 */
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from '@aws-sdk/client-s3';

const SOURCE_PREFIX = 'slutbot.ai/examples/';
const BUCKET = process.env.R2_PRESET_BUCKET || 'slutbotai';

const DRY_RUN = process.argv.includes('--dry-run');
const KEEP_SOURCE = process.argv.includes('--keep-source');

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

if (!accountId || !accessKeyId || !secretAccessKey) {
  console.error('Missing R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY.');
  console.error('Run with: node --env-file=.env.local scripts/move-examples-to-r2-root.mjs');
  process.exit(1);
}

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
});

async function listAll(prefix) {
  const keys = [];
  let ContinuationToken;
  do {
    const res = await client.send(
      new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix, ContinuationToken }),
    );
    for (const obj of res.Contents || []) {
      if (obj.Key) keys.push(obj.Key);
    }
    ContinuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (ContinuationToken);
  return keys;
}

async function destExists(key, size) {
  try {
    const head = await client.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return typeof head.ContentLength === 'number' && head.ContentLength === size;
  } catch {
    return false;
  }
}

async function main() {
  const keys = (await listAll(SOURCE_PREFIX)).sort();
  console.log(`Found ${keys.length} objects under ${SOURCE_PREFIX}`);
  console.log(
    `  -> moving to bucket root of r2://${BUCKET}/  (dryRun=${DRY_RUN}, keepSource=${KEEP_SOURCE})\n`,
  );

  let moved = 0;
  let deleted = 0;

  for (const key of keys) {
    const destKey = key.slice(SOURCE_PREFIX.length);
    if (!destKey) continue;

    if (DRY_RUN) {
      console.log(`  ~ ${key}  ->  ${destKey} [dry-run]`);
      moved += 1;
      continue;
    }

    await client.send(
      new CopyObjectCommand({
        Bucket: BUCKET,
        CopySource: `/${BUCKET}/${encodeURI(key)}`,
        Key: destKey,
        MetadataDirective: 'COPY',
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );
    moved += 1;
    console.log(`  ↑ ${destKey}`);

    if (!KEEP_SOURCE) {
      // Only delete the source once the destination is confirmed present.
      const head = await client.send(new HeadObjectCommand({ Bucket: BUCKET, Key: destKey }));
      if (head && typeof head.ContentLength === 'number') {
        await client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
        deleted += 1;
      } else {
        console.warn(`  ! Skipped delete for ${key} (destination not confirmed)`);
      }
    }
  }

  console.log(`\nDone. copied=${moved} deleted=${deleted}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
