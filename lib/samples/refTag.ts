const REF_MIN = 30;
const REF_MAX = 2300;
const REF_SPAN = REF_MAX - REF_MIN + 1;

/** Stable pseudo-random ref per sample id (30–2300), not tied to grid order. */
export function sampleRefTag(sampleId: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0xdeadbeef;
  for (let i = 0; i < sampleId.length; i++) {
    const c = sampleId.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193);
    h2 = Math.imul(h2 ^ (c + i * 131), 0x85ebca6b);
    h1 ^= Math.imul(h2 ^ (h1 >>> 13), 0xc2b2ae35);
    h2 ^= Math.imul(h1 ^ (h2 >>> 15), 0x27d4eb2f);
  }
  const mixed = (h1 ^ h2 ^ Math.imul(h1 >>> 16, h2 | 1)) >>> 0;
  const n = REF_MIN + (mixed % REF_SPAN);
  return `#${n}`;
}
