import { getImageToVideoClientId } from '@/app/tool/clientId';
import { capturePosthogEvent } from '@/lib/posthog';
import type { TrackKind, TrackName } from '@/lib/trackTypes';

export function trackEvent(
  name: TrackName,
  extra?: { kind?: TrackKind; label?: string; plan?: string; method?: string },
) {
  if (typeof window === 'undefined') return;
  const payload = {
    name,
    kind: extra?.kind,
    path: window.location.pathname,
    label: extra?.label,
    plan: extra?.plan,
    method: extra?.method,
    clientId: getImageToVideoClientId(),
  };
  capturePosthogEvent(name, payload);
  const body = JSON.stringify(payload);
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/track', new Blob([body], { type: 'application/json' }));
      return;
    }
  } catch {
    /* fall through */
  }
  void fetch('/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => undefined);
}
