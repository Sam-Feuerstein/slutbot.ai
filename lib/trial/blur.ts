import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ffmpegPath from 'ffmpeg-static';
import { TRIAL_VIDEO_BLUR_SIGMA } from '@/lib/trial/config';

const BLUR_TIMEOUT_MS = 45_000;

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) {
      reject(new Error('ffmpeg is not available.'));
      return;
    }
    const proc = spawn(ffmpegPath, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    const timer = setTimeout(() => {
      proc.kill('SIGKILL');
      reject(new Error('Preview lock timed out.'));
    }, BLUR_TIMEOUT_MS);
    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error('Could not lock preview.'));
    });
  });
}

/** Server-side blur. The original buffer must never be returned to the client. */
export async function blurTrialVideo(input: Buffer): Promise<Buffer> {
  const dir = await mkdtemp(join(tmpdir(), 'slutbot-blur-'));
  const inPath = join(dir, 'in.mp4');
  const outPath = join(dir, 'out.mp4');
  try {
    await writeFile(inPath, input);
    await runFfmpeg([
      '-y',
      '-i',
      inPath,
      '-vf',
      `scale=480:-2:flags=fast_bilinear,gblur=sigma=${TRIAL_VIDEO_BLUR_SIGMA}:steps=2`,
      '-an',
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '32',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      outPath,
    ]);
    return await readFile(outPath);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
