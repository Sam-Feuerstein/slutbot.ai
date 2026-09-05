/**
 * Compress checkout promo video + poster, upload to R2 (slutbotai/slutbot.ai/checkout/).
 *
 * Usage: node --env-file=.env.local scripts/upload-checkout-promo-to-r2.mjs
 */
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const WORK = join(ROOT, '.tmp/checkout-promo-upload');
const PREFIX = 'slutbot.ai/checkout';
const BUCKET = process.env.R2_PRESET_BUCKET || 'slutbotai';

const SOURCE =
  process.argv[2] ||
  join(process.env.HOME || '', 'Downloads/Swipey AI AI Girlfriend Platform Chat Voice NSFW.mp4');

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

if (!accountId || !accessKeyId || !secretAccessKey) {
  console.error('Missing R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY in .env.local');
  process.exit(1);
}

if (!existsSync(SOURCE)) {
  console.error(`Source video not found: ${SOURCE}`);
  process.exit(1);
}

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
});

function run(cmd) {
  execSync(cmd, { stdio: 'inherit' });
}

async function uploadFile(key, filePath, contentType) {
  const body = readFileSync(filePath);
  await client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  );
  console.log(`  ↑ ${key} (${(body.length / 1024).toFixed(1)} KB)`);
}

mkdirSync(WORK, { recursive: true });

const mp4Out = join(WORK, 'swipey-promo.mp4');
const posterJpg = join(WORK, 'swipey-promo.jpg');
const publicDir = join(ROOT, 'public/checkout');

console.log('Compressing checkout promo…');
run(
  `ffmpeg -y -hide_banner -loglevel error -i "${SOURCE}" -an -vf "scale=-2:480:flags=lanczos" -c:v libx264 -preset slow -crf 32 -pix_fmt yuv420p -movflags +faststart "${mp4Out}"`,
);
run(
  `ffmpeg -y -hide_banner -loglevel error -ss 0.1 -i "${mp4Out}" -vframes 1 -vf "scale=-2:640:flags=lanczos" -q:v 5 "${posterJpg}"`,
);

mkdirSync(publicDir, { recursive: true });
run(`cp "${posterJpg}" "${join(publicDir, 'swipey-promo.jpg')}"`);

console.log('\nUploading to R2…');
await uploadFile(`${PREFIX}/AISLUTBOT-NUDE GENERATOR.mp4`, mp4Out, 'video/mp4');
await uploadFile(`${PREFIX}/swipey-promo.jpg`, posterJpg, 'image/jpeg');

const base =
  process.env.NEXT_PUBLIC_PRESET_MEDIA_BASE || 'https://pub-17aa5d996caf4f7086190be5ee8807c5.r2.dev';
console.log(`\nDone. CDN URLs:`);
console.log(`${base}/${PREFIX}/AISLUTBOT-NUDE GENERATOR.mp4`);
console.log(`${base}/${PREFIX}/swipey-promo.jpg`);

rmSync(WORK, { recursive: true, force: true });
