export function prefersReducedMedia(): boolean {
  if (typeof window === 'undefined') return true;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (connection?.saveData) return true;
  return false;
}

/** How many muted preview clips may play at once. */
export function maxAutoplayingVideos(): number {
  if (typeof window === 'undefined') return 0;
  if (prefersReducedMedia()) return 0;
  if (window.matchMedia('(min-width: 1024px)').matches) return 4;
  if (window.matchMedia('(min-width: 768px)').matches) return 3;
  return 2;
}
