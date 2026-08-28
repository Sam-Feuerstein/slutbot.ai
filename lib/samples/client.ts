import { getImageToVideoClientId } from '@/app/tool/clientId';

export type SampleEngageAction = 'click' | 'like' | 'unlike';

export async function engageSample(
  sampleId: string,
  action: SampleEngageAction,
): Promise<{ liked: boolean; likeCount: number } | null> {
  if (typeof window === 'undefined' || !sampleId) return null;
  const clientId = getImageToVideoClientId();
  try {
    const res = await fetch('/api/samples/engage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sampleId, action, clientId }),
      keepalive: true,
    });
    if (!res.ok) return null;
    return (await res.json()) as { liked: boolean; likeCount: number };
  } catch {
    return null;
  }
}

export function trackSampleClick(sampleId: string) {
  void engageSample(sampleId, 'click');
}
