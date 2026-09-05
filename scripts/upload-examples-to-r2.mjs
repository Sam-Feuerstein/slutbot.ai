/**
 * Mirror public/examples/** to the public R2 preset bucket so sample media is
 * served from the CDN instead of egressing from Vercel.
 *
 * Keys are written at the bucket root, matching exampleMediaUrl() in
 * lib/presetMedia.ts:
 *   /examples/foo.jpg  ->  {NEXT_PUBLIC_PRESET_MEDIA_BASE}/foo.jpg
 *
 * Usage:
 *   node --env-file=.env.local scripts/upload-examples-to-r2.mjs           # upload missing/changed
 *   node --env-file=.env.local scripts/upload-examples-to-r2.mjs --force   # re-upload everything
 *   node --env-file=.env.local scripts/upload-examples-to-r2.mjs --dry-run # list only
 */
import { HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const SOURCE_DIR = join(ROOT, 'public', 'examples');
// Example media lives at the bucket root (e.g. example-ex-1.jpg, before-after/…).
const PREFIX = '';
const BUCKET = process.env.R2_PRESET_BUCKET || 'slutbotai';

const FORCE = process.argv.includes('--force');
const DRY_RUN = process.argv.includes('--dry-run');

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

if (!accountId || !accessKeyId || !secretAccessKey) {
  console.error('Missing R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY.');
  console.error('Run with: node --env-file=.env.local scripts/upload-examples-to-r2.mjs');
  process.exit(1);
}

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
});

function contentTypeFor(file) {
  const ext = extname(file).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';
  if (ext === '.mp4') return 'video/mp4';
  if (ext === '.webm') return 'video/webm';
  return 'application/octet-stream';
}

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walk(full));
    else if (st.isFile()) out.push(full);
  }
  return out;
}

async function existsWithSameSize(key, size) {
  try {
    const head = await client.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return typeof head.ContentLength === 'number' && head.ContentLength === size;
  } catch {
    return false;
  }
}

async function main() {
  let files;
  try {
    files = walk(SOURCE_DIR);
  } catch (err) {
    console.error(`Cannot read ${SOURCE_DIR}: ${err.message}`);
    process.exit(1);
  }

  files.sort();
  console.log(`Mirroring ${files.length} files from public/examples/`);
  console.log(`  -> r2://${BUCKET}/${PREFIX}  (force=${FORCE}, dryRun=${DRY_RUN})\n`);

  let uploaded = 0;
  let skipped = 0;
  let bytes = 0;

  for (const filePath of files) {
    const rel = relative(SOURCE_DIR, filePath).split(/[\\/]/).join('/');
    const key = PREFIX ? `${PREFIX}/${rel}` : rel;
    const body = readFileSync(filePath);
    const contentType = contentTypeFor(filePath);

    if (!FORCE && (await existsWithSameSize(key, body.length))) {
      skipped += 1;
      console.log(`  = ${key} (exists)`);
      continue;
    }

    if (DRY_RUN) {
      console.log(`  + ${key} (${(body.length / 1024).toFixed(1)} KB) [dry-run]`);
      uploaded += 1;
      bytes += body.length;
      continue;
    }

    await client.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );
    uploaded += 1;
    bytes += body.length;
    console.log(`  ↑ ${key} (${(body.length / 1024).toFixed(1)} KB)`);
  }

  console.log(
    `\nDone. uploaded=${uploaded} skipped=${skipped} total=${(bytes / (1024 * 1024)).toFixed(1)} MB`,
  );
  if (!DRY_RUN && uploaded > 0) {
    console.log(
      'Sample media now serves from R2 whenever NEXT_PUBLIC_PRESET_MEDIA_BASE is set (Vercel + .env.local).',
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
