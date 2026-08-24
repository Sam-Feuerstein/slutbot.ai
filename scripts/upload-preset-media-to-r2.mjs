/**
 * Download preset media, build 720p previews + JPG posters, upload to R2 bucket slutbotai/slutbot.ai/
 *
 * Usage: node --env-file=.env.local scripts/upload-preset-media-to-r2.mjs
 */
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { execSync } from 'node:child_process';
import { createWriteStream, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const WORK = join(ROOT, '.tmp/preset-media-upload');
const PREFIX = 'slutbot.ai';
const BUCKET = process.env.R2_PRESET_BUCKET || 'slutbotai';

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

if (!accountId || !accessKeyId || !secretAccessKey) {
  console.error('Missing R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY in .env.local');
  process.exit(1);
}

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
});

/** @type {{ generation: number, id: string, poster: string, mp4?: string, sourceImage: string, mainImage?: string }[]} */
const PRESETS = [
  { generation: 1, id: 'blowjob-2', poster: 'https://fra1.digitaloceanspaces.com/cdn.removeclothes.ai/Blowjob_2_0_prev.webp', mp4: 'https://fra1.digitaloceanspaces.com/cdn.removeclothes.ai/Blowjob_2_0_prev.mp4', sourceImage: '/mock/home/Blowjob_2.0.webp' },
  { generation: 2, id: 'cumshot-2', poster: 'https://fra1.digitaloceanspaces.com/cdn.removeclothes.ai/Cumshot_2_0_prev.webp', mp4: 'https://fra1.digitaloceanspaces.com/cdn.removeclothes.ai/Cumshot_2_0_prev.mp4', sourceImage: '/mock/home/Cumshot_2.0.webp' },
  { generation: 3, id: 'missionary-2', poster: 'https://fra1.digitaloceanspaces.com/cdn.removeclothes.ai/Missionary_2_0_prev.webp', mp4: 'https://fra1.digitaloceanspaces.com/cdn.removeclothes.ai/Missionary_2_0_prev.mp4', sourceImage: '/mock/home/Missionary_2.0.webp' },
  { generation: 4, id: 'shows-tits-2', poster: 'https://fra1.digitaloceanspaces.com/cdn.removeclothes.ai/Shows_Tits_2_0_prev.webp', mp4: 'https://fra1.digitaloceanspaces.com/cdn.removeclothes.ai/Shows_Tits_2_0_prev.mp4', sourceImage: '/mock/home/Shows_tits_mini_prev.webp' },
  { generation: 5, id: 'cumshot-pov', poster: 'https://fra1.digitaloceanspaces.com/cdn.removeclothes.ai/Cumshot_POV.webp', mp4: 'https://fra1.digitaloceanspaces.com/cdn.removeclothes.ai/Cumshot_POV.mp4', sourceImage: '/mock/home/Cumshot_POV.webp' },
  { generation: 6, id: 'hard-doggy', poster: 'https://fra1.digitaloceanspaces.com/cdn.removeclothes.ai/2_new_Hard_Doggy_new.webp', mp4: 'https://fra1.digitaloceanspaces.com/cdn.removeclothes.ai/2_new_Hard_Doggy.mp4', sourceImage: '/mock/home/4_new_hard_doggy_new.webp' },
  { generation: 7, id: 'front-doggy', poster: 'https://fra1.digitaloceanspaces.com/cdn.removeclothes.ai/Test_2_Front_Doggy.webp', mp4: 'https://fra1.digitaloceanspaces.com/cdn.removeclothes.ai/Test_2_Front_Doggy.mp4', sourceImage: '/mock/home/3_new_Front_Doggy_mini_prev_160x200.webp' },
  { generation: 8, id: 'doggy-style-2', poster: 'https://fra1.digitaloceanspaces.com/cdn.removeclothes.ai/3_new_Doggy_Style_2_0_poster_webp.webp', mp4: 'https://fra1.digitaloceanspaces.com/cdn.removeclothes.ai/3_new_Doggy_Style_2_0_mp4.mp4', sourceImage: '/mock/home/Doggy_Style_mini_prev.webp' },
  { generation: 9, id: 'handjob', poster: 'https://fra1.digitaloceanspaces.com/cdn.removeclothes.ai/Handjob_prev.webp', mp4: 'https://fra1.digitaloceanspaces.com/cdn.removeclothes.ai/Handjob_prev.mp4', sourceImage: '/mock/home/Handjob.webp' },
  { generation: 10, id: 'reverse-cowgirl-2', poster: 'https://fra1.digitaloceanspaces.com/cdn.removeclothes.ai/Reverse_Cowgirl_2_0_prev.webp', mp4: 'https://fra1.digitaloceanspaces.com/cdn.removeclothes.ai/Reverse_Cowgirl_2_0_prev.mp4', sourceImage: '/mock/home/Reverse_Cowgirl_2.0.webp' },
  { generation: 11, id: 'standing-doggy', poster: 'https://fra1.digitaloceanspaces.com/cdn.removeclothes.ai/standing-doggy-style-clip-prev-image-webp-6a2b68ae182fb.webp', mp4: 'https://fra1.digitaloceanspaces.com/cdn.removeclothes.ai/Standing_Doggy_Style_clip_prev_video_mp4_compressed.mp4', sourceImage: '/mock/home/standing-doggy-style-clip-mini-prev-image-webp-6a2b68a75dbc7.webp' },
  { generation: 12, id: 'blowjob-pov', poster: '/mock/home/blowjob-pov-clip-prev-image-webp-6a310102327c6.webp', sourceImage: '/mock/home/blowjob-pov-clip-mini-prev-image-webp-6a3100f717025.webp', mainImage: '/mock/home/blowjob-pov-clip-prev-image-webp-6a310102327c6.webp' },
  { generation: 13, id: 'spicybox-standing-backshots-slam', poster: 'https://spicybox-generations.b-cdn.net/generation-templates/images/e0355d87-805f-4dea-abbb-72038b85583f.jpg', sourceImage: '/mock/spicybox/98900660-845a-4e97-aff2-f19fa3348c23.jpg', mainImage: '/mock/spicybox/e0355d87-805f-4dea-abbb-72038b85583f.jpg' },
  { generation: 14, id: 'spicybox-classic-blowjob', poster: 'https://spicybox-generations.b-cdn.net/generation-templates/images/1afded17-3d76-4920-9fa4-5613d7318f37.webp', mp4: 'https://spicybox-generations.b-cdn.net/generation-templates/videos/98988e95-cff0-4556-90f7-e8f9f60d05a4.mp4', sourceImage: '/mock/spicybox/1afded17-3d76-4920-9fa4-5613d7318f37.webp' },
  { generation: 15, id: 'spicybox-double-blowjob', poster: 'https://spicybox-generations.b-cdn.net/generation-templates/images/444422f8-bd6b-45eb-83f2-d37f816e27cf.webp', mp4: 'https://spicybox-generations.b-cdn.net/generation-templates/videos/1a87763f-bf41-47ee-9ff9-48bf21e65abc.mp4', sourceImage: '/mock/spicybox/444422f8-bd6b-45eb-83f2-d37f816e27cf.webp' },
  { generation: 16, id: 'spicybox-blowjob', poster: 'https://spicybox-generations.b-cdn.net/generation-templates/images/a9b4cb8d-4089-4963-aeea-2e590ec79753.webp', sourceImage: '/mock/spicybox/a9b4cb8d-4089-4963-aeea-2e590ec79753.webp', mainImage: '/mock/spicybox/a9b4cb8d-4089-4963-aeea-2e590ec79753.webp' },
  { generation: 17, id: 'spicybox-pov-missionary', poster: 'https://spicybox-generations.b-cdn.net/generation-templates/images/f336412d-07fd-4fce-b4e3-e369bc98754e.webp', mp4: 'https://spicybox-generations.b-cdn.net/generation-templates/videos/fa9c5ea3-7890-4e20-8607-78797a73754d.mp4', sourceImage: '/mock/spicybox/f336412d-07fd-4fce-b4e3-e369bc98754e.webp' },
  { generation: 18, id: 'spicybox-pov-insane-blowjob', poster: 'https://spicybox-generations.b-cdn.net/generation-templates/images/d00ed7ce-0c6e-47d4-8dbc-8690b683b4af.webp', mp4: 'https://spicybox-generations.b-cdn.net/generation-templates/videos/49074fd2-f4a5-46d0-84aa-16528bbd939a.mp4', sourceImage: '/mock/spicybox/d00ed7ce-0c6e-47d4-8dbc-8690b683b4af.webp' },
  { generation: 19, id: 'spicybox-wide-spread-ass', poster: 'https://spicybox-generations.b-cdn.net/generation-templates/images/64071ad0-0411-4adc-add9-29a8aaf41529.webp', mp4: 'https://spicybox-generations.b-cdn.net/generation-templates/videos/1d633541-55b6-4214-b178-d25d10cded17.mp4', sourceImage: '/mock/spicybox/64071ad0-0411-4adc-add9-29a8aaf41529.webp' },
  { generation: 20, id: 'spicybox-nudify', poster: 'https://spicybox-generations.b-cdn.net/generation-templates/images/e8626dae-23f7-4df9-99eb-a2c03b85c7a9.jpg', sourceImage: '/mock/spicybox/0e8f6f5d-d6c3-4b7b-97b8-fb2ce592db50.jpg', mainImage: '/mock/spicybox/e8626dae-23f7-4df9-99eb-a2c03b85c7a9.jpg' },
  { generation: 21, id: 'spicybox-doggy-style-looking-back', poster: 'https://spicybox-generations.b-cdn.net/generation-templates/images/7107887f-983a-426f-b392-160184e94804.webp', mp4: 'https://spicybox-generations.b-cdn.net/generation-templates/videos/f05375dd-22db-4bd8-80f8-a143e7247600.mp4', sourceImage: '/mock/spicybox/7107887f-983a-426f-b392-160184e94804.webp' },
  { generation: 22, id: 'spicybox-deep-squat-anal', poster: 'https://spicybox-generations.b-cdn.net/generation-templates/images/92aafea3-dd28-4a80-abef-af3323d5baf9.jpg', mp4: 'https://spicybox-generations.b-cdn.net/generation-templates/videos/49e2784a-ac5e-4a67-8909-8a2f7a47d4ca.mp4', sourceImage: '/mock/spicybox/92aafea3-dd28-4a80-abef-af3323d5baf9.jpg' },
  { generation: 23, id: 'spicybox-glory-hole-blowjob', poster: 'https://spicybox-generations.b-cdn.net/generation-templates/images/7cf6bcf8-4ce6-435d-9673-b4580f29ec1b.jpg', mp4: 'https://spicybox-generations.b-cdn.net/generation-templates/videos/9d0ac14e-0953-4641-8d72-ea89d2c96838.mp4', sourceImage: '/mock/spicybox/7cf6bcf8-4ce6-435d-9673-b4580f29ec1b.jpg' },
  { generation: 24, id: 'spicybox-pov-cowgirl', poster: 'https://spicybox-generations.b-cdn.net/generation-templates/images/3b357063-f3c6-427f-b016-bc8ff09f7fb1.webp', sourceImage: '/mock/spicybox/3b357063-f3c6-427f-b016-bc8ff09f7fb1.webp', mainImage: '/mock/spicybox/3b357063-f3c6-427f-b016-bc8ff09f7fb1.webp' },
  { generation: 25, id: 'spicybox-explosive-cumshot', poster: 'https://spicybox-generations.b-cdn.net/generation-templates/images/7e0aa7a3-7105-4914-b7a2-de8972e2fdbe.webp', mp4: 'https://spicybox-generations.b-cdn.net/generation-templates/videos/33f9534e-3d8f-4758-9d9f-775062949a92.mp4', sourceImage: '/mock/spicybox/7e0aa7a3-7105-4914-b7a2-de8972e2fdbe.webp' },
  { generation: 26, id: 'spicybox-gangbang-cowgirl-blowjob', poster: 'https://spicybox-generations.b-cdn.net/generation-templates/images/5d17dded-510e-4e85-b171-c816b781e3af.jpg', mp4: 'https://spicybox-generations.b-cdn.net/generation-templates/videos/cd9d88b7-e17f-4f2f-8078-9a0b2cc1f66b.mp4', sourceImage: '/mock/spicybox/5d17dded-510e-4e85-b171-c816b781e3af.jpg' },
  { generation: 27, id: 'spicybox-double-cowgirl', poster: 'https://spicybox-generations.b-cdn.net/generation-templates/images/fc614bde-60da-4752-a9cc-24c3822bf458.jpg', mp4: 'https://spicybox-generations.b-cdn.net/generation-templates/videos/bbb095ea-b3a1-4744-b3e0-3e56436190ac.mp4', sourceImage: '/mock/spicybox/fc614bde-60da-4752-a9cc-24c3822bf458.jpg' },
  { generation: 28, id: 'spicybox-doggy-style', poster: 'https://spicybox-generations.b-cdn.net/generation-templates/images/783818ef-bd8d-4f06-9330-ff901eb5b49d.webp', sourceImage: '/mock/spicybox/783818ef-bd8d-4f06-9330-ff901eb5b49d.webp', mainImage: '/mock/spicybox/783818ef-bd8d-4f06-9330-ff901eb5b49d.webp' },
  { generation: 29, id: 'spicybox-intense-cowgirl', poster: 'https://spicybox-generations.b-cdn.net/generation-templates/images/41ef19e3-d367-4bc1-baac-25a4b4af47b6.webp', mp4: 'https://spicybox-generations.b-cdn.net/generation-templates/videos/d3a28657-af21-4d92-80d3-6bec83144b61.mp4', sourceImage: '/mock/spicybox/41ef19e3-d367-4bc1-baac-25a4b4af47b6.webp' },
  { generation: 30, id: 'spicybox-sloppy-cowgirl', poster: 'https://spicybox-generations.b-cdn.net/generation-templates/images/e8a0fef2-4939-450e-b2ac-75107e31a7a3.jpg', mp4: 'https://spicybox-generations.b-cdn.net/generation-templates/videos/0ccde946-abd2-4057-988b-77d4a546ffb6.mp4', sourceImage: '/mock/spicybox/e8a0fef2-4939-450e-b2ac-75107e31a7a3.jpg' },
  { generation: 31, id: 'spicybox-missionary-stroke', poster: 'https://spicybox-generations.b-cdn.net/generation-templates/images/3cd362d7-1d6d-4072-85e7-394594ed4ac7.webp', mp4: 'https://spicybox-generations.b-cdn.net/generation-templates/videos/bef06071-e4cc-4934-ba35-f1d9f52829b2.mp4', sourceImage: '/mock/spicybox/3cd362d7-1d6d-4072-85e7-394594ed4ac7.webp' },
];

const EXTRA_ASSETS = [
  { key: `${PREFIX}/ui/gb.webp`, local: 'public/mock/spicybox/gb.webp', contentType: 'image/webp' },
  { key: `${PREFIX}/ui/promo-source.jpg`, local: 'public/mock/spicybox/98900660-845a-4e97-aff2-f19fa3348c23.jpg', contentType: 'image/jpeg' },
  { key: `${PREFIX}/ui/promo-result.webp`, remote: 'https://spicybox-generations.b-cdn.net/generation-templates/images/1afded17-3d76-4920-9fa4-5613d7318f37.webp', contentType: 'image/webp' },
  { key: `${PREFIX}/ui/banner-bg.mp4`, local: 'public/mock/spicybox/banner-bg-new.mp4', contentType: 'video/mp4' },
  { key: `${PREFIX}/tool/undress-demo.mp4`, local: 'public/mock/tool/undress-demo.mp4', contentType: 'video/mp4' },
];

function assetBase(generation) {
  return `ai-slut-video-generation${generation}`;
}

function localPathFromPublic(urlPath) {
  return join(ROOT, 'public', urlPath.replace(/^\//, ''));
}

async function fetchToFile(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed ${url}: ${res.status}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
}

async function resolveToFile(src, dest) {
  if (src.startsWith('http')) {
    await fetchToFile(src, dest);
    return;
  }
  const local = localPathFromPublic(src);
  if (!existsSync(local)) throw new Error(`Missing local file: ${local}`);
  writeFileSync(dest, readFileSync(local));
}

function run(cmd) {
  execSync(cmd, { stdio: 'inherit' });
}

function contentTypeFor(file) {
  const ext = extname(file).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.png') return 'image/png';
  if (ext === '.mp4') return 'video/mp4';
  return 'application/octet-stream';
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

async function processPreset(preset) {
  const base = assetBase(preset.generation);
  const dir = join(WORK, base);
  mkdirSync(dir, { recursive: true });

  console.log(`\n#${preset.generation} ${preset.id}`);

  const posterSrc = join(dir, 'poster-src' + extname(preset.poster.split('?')[0] || '.webp'));
  await resolveToFile(preset.poster, posterSrc);

  const posterJpg = join(dir, `${base}.jpg`);
  run(`ffmpeg -y -hide_banner -loglevel error -i "${posterSrc}" -vf "scale=-2:720:flags=lanczos" -q:v 2 "${posterJpg}"`);
  await uploadFile(`${PREFIX}/${base}.jpg`, posterJpg, 'image/jpeg');

  const sourceExt = extname(preset.sourceImage).toLowerCase() || '.webp';
  const sourceFile = join(dir, `${base}-source${sourceExt}`);
  await resolveToFile(preset.sourceImage, sourceFile);
  await uploadFile(`${PREFIX}/${base}-source${sourceExt}`, sourceFile, contentTypeFor(sourceFile));

  if (preset.mainImage && preset.mainImage !== preset.poster && preset.mainImage !== preset.sourceImage) {
    const mainExt = extname(preset.mainImage).toLowerCase() || '.webp';
    const mainFile = join(dir, `${base}-main${mainExt}`);
    await resolveToFile(preset.mainImage, mainFile);
    await uploadFile(`${PREFIX}/${base}-main${mainExt}`, mainFile, contentTypeFor(mainFile));
  }

  if (!preset.mp4) return;

  const mp4Local = join(dir, `${base}.mp4`);
  await resolveToFile(preset.mp4, mp4Local);
  await uploadFile(`${PREFIX}/${base}.mp4`, mp4Local, 'video/mp4');

  const previewLocal = join(dir, `${base}-preview.mp4`);
  run(
    `ffmpeg -y -hide_banner -loglevel error -i "${mp4Local}" -an -vf "scale=-2:720:flags=lanczos" -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -movflags +faststart "${previewLocal}"`,
  );
  await uploadFile(`${PREFIX}/${base}-preview.mp4`, previewLocal, 'video/mp4');
}

async function processExtra(asset) {
  const dir = join(WORK, 'extra');
  mkdirSync(dir, { recursive: true });
  const filename = basename(asset.key);
  const dest = join(dir, filename);
  if (asset.local) {
    if (!existsSync(join(ROOT, asset.local))) {
      console.warn(`Skipping missing extra: ${asset.local}`);
      return;
    }
    writeFileSync(dest, readFileSync(join(ROOT, asset.local)));
  } else if (asset.remote) {
    await fetchToFile(asset.remote, dest);
  }
  await uploadFile(asset.key, dest, asset.contentType);
}

async function main() {
  rmSync(WORK, { recursive: true, force: true });
  mkdirSync(WORK, { recursive: true });

  console.log(`Uploading to r2://${BUCKET}/${PREFIX}/`);

  for (const preset of PRESETS) {
    await processPreset(preset);
  }

  console.log('\nExtras');
  for (const asset of EXTRA_ASSETS) {
    await processExtra(asset);
  }

  const manifest = {
    bucket: BUCKET,
    prefix: PREFIX,
    publicBaseEnv: 'NEXT_PUBLIC_PRESET_MEDIA_BASE',
    assets: PRESETS.map((p) => ({
      generation: p.generation,
      id: p.id,
      base: assetBase(p.generation),
      hasVideo: Boolean(p.mp4),
    })),
  };
  writeFileSync(join(ROOT, 'scripts/preset-media-manifest.json'), JSON.stringify(manifest, null, 2));
  console.log('\nDone. Enable public access on slutbotai, then set NEXT_PUBLIC_PRESET_MEDIA_BASE to the pub-....r2.dev URL.');
  console.log('Run: npx wrangler r2 bucket dev-url enable slutbotai');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
