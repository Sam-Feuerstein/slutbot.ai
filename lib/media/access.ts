import connectDB from '@/lib/db/mongodb';
import { AiToolGeneration, GenerationJob } from '@/lib/models';
import { USER_UPLOAD_PREFIX } from '@/lib/media/sign';

function keyVariants(key: string): string[] {
  const trimmed = key.trim();
  if (!trimmed) return [];
  const bare = trimmed.startsWith('r2:') ? trimmed.slice(3) : trimmed;
  const withR2 = `r2:${bare}`;
  return [...new Set([trimmed, bare, withR2])];
}

function userIdFromPrivateKey(key: string): string | null {
  const bare = key.startsWith('r2:') ? key.slice(3) : key;
  const match = bare.match(new RegExp(`^${USER_UPLOAD_PREFIX}(?:outputs|previews)/([^/]+)/`));
  return match?.[1] || null;
}

/** True when the signed-in user owns this private media key. */
export async function userOwnsMediaKey(userId: string, key: string): Promise<boolean> {
  const id = String(userId || '').trim();
  if (!id || !key.trim()) return false;

  const ownerFromPath = userIdFromPrivateKey(key);
  if (ownerFromPath && ownerFromPath !== id) return false;
  if (ownerFromPath === id) return true;

  const variants = keyVariants(key);
  if (!variants.length) return false;

  try {
    await connectDB();
    const [generation, job] = await Promise.all([
      AiToolGeneration.findOne({
        userId: id,
        $or: [
          { outputKey: { $in: variants } },
          { previewKey: { $in: variants } },
          { sourceImageUrl: { $in: variants } },
          { outputUrl: { $in: variants } },
        ],
      })
        .select('_id')
        .lean(),
      GenerationJob.findOne({
        userId: id,
        sourceKey: { $in: variants },
      })
        .select('_id')
        .lean(),
    ]);
    return Boolean(generation || job);
  } catch {
    return false;
  }
}

/** WaveSpeed fetches user uploads by signed URL without a session cookie. */
export function isWavespeedSourceKey(key: string): boolean {
  const bare = key.startsWith('r2:') ? key.slice(3) : key;
  return bare.startsWith(`${USER_UPLOAD_PREFIX}uploads/`) && !bare.includes('..');
}

/** Outputs and previews must never be served without an owner session. */
export function requiresOwnerSession(key: string): boolean {
  const bare = key.startsWith('r2:') ? key.slice(3) : key;
  if (!bare.startsWith(USER_UPLOAD_PREFIX) || bare.includes('..')) return true;
  return bare.includes('/outputs/') || bare.includes('/previews/');
}
