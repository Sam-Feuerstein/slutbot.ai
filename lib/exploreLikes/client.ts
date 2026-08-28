import { getImageToVideoClientId } from '@/app/tool/clientId';

export async function fetchExploreLikes(): Promise<{
  likedIds: Set<string>;
  displayCounts: Record<string, number>;
} | null> {
  if (typeof window === 'undefined') return null;
  const clientId = getImageToVideoClientId();
  if (!clientId) return null;
  try {
    const res = await fetch(`/api/explore/likes?clientId=${encodeURIComponent(clientId)}`);
    if (!res.ok) return null;
    const json = (await res.json()) as {
      likedIds?: string[];
      displayCounts?: Record<string, number>;
    };
    return {
      likedIds: new Set(json.likedIds || []),
      displayCounts: json.displayCounts || {},
    };
  } catch {
    return null;
  }
}

export async function toggleExplorePresetLike(
  presetId: string,
  action: 'like' | 'unlike',
): Promise<{ liked: boolean; displayCount: number } | null> {
  if (typeof window === 'undefined' || !presetId) return null;
  const clientId = getImageToVideoClientId();
  try {
    const res = await fetch('/api/explore/likes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ presetId, action, clientId }),
      keepalive: true,
    });
    if (!res.ok) return null;
    return (await res.json()) as { liked: boolean; displayCount: number };
  } catch {
    return null;
  }
}
