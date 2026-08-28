const SEED_MIN = 31;
const SEED_MAX = 987;

/** Stable pseudo-random base under 1K per explore preset — not sequential. */
export function presetLikeSeed(presetId: string): number {
  let h1 = 0x811c9dc5;
  let h2 = 0xdeadbeef;
  for (let i = 0; i < presetId.length; i++) {
    const c = presetId.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193);
    h2 = Math.imul(h2 ^ (c + i * 131), 0x85ebca6b);
    h1 ^= Math.imul(h2 ^ (h1 >>> 13), 0xc2b2ae35);
    h2 ^= Math.imul(h1 ^ (h2 >>> 15), 0x27d4eb2f);
  }
  const mixed = (h1 ^ h2 ^ Math.imul(h1 >>> 16, h2 | 1)) >>> 0;
  return SEED_MIN + (mixed % (SEED_MAX - SEED_MIN + 1));
}

export function displayPresetLikeCount(presetId: string, realLikes: number): number {
  return presetLikeSeed(presetId) + Math.max(0, Math.round(realLikes));
}
