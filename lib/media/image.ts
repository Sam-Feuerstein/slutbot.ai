/**
 * Whether a media URL points at a remote CDN (R2, bunny.net, etc.) rather than
 * a local `/public` asset.
 *
 * Remote posters/thumbnails are already delivered by a CDN, so routing them
 * through Vercel's Image Optimizer just burns Image Optimization units for no
 * benefit. `next/image` with `unoptimized` still handles layout/lazy-loading
 * but serves the original bytes straight from the CDN.
 *
 * Local `/examples/*` assets (relative paths) keep optimization — they have no
 * CDN in front and benefit from AVIF/WebP + resizing.
 */
export function isRemoteMedia(url: string | undefined | null): boolean {
  if (!url) return false;
  return url.startsWith('http://') || url.startsWith('https://');
}
