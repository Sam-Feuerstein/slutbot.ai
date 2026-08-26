export const POSTHOG_KEY = 'phc_vhpoTbU6niruS3UyaDBSPucqYMBbvhdHbNYrx2ePe3MQ';
export const POSTHOG_HOST = 'https://us.i.posthog.com';

type PostHogClient = {
  capture: (event: string, properties?: Record<string, unknown>) => void;
  captureException: (error: unknown, properties?: Record<string, unknown>) => void;
  identify: (distinctId: string, properties?: Record<string, unknown>) => void;
  reset: () => void;
};

declare global {
  interface Window {
    posthog?: PostHogClient;
  }
}

export function getPosthog(): PostHogClient | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.posthog;
}

export function capturePosthogEvent(event: string, properties?: Record<string, unknown>) {
  try {
    getPosthog()?.capture(event, properties);
  } catch {
    /* ignore */
  }
}

export function capturePosthogException(error: unknown, properties?: Record<string, unknown>) {
  try {
    const client = getPosthog();
    if (!client) return;
    if (typeof client.captureException === 'function') {
      client.captureException(error, properties);
      return;
    }
    client.capture('$exception', {
      ...properties,
      message: error instanceof Error ? error.message : String(error),
    });
  } catch {
    /* ignore */
  }
}

export function identifyPosthogUser(distinctId: string, properties?: Record<string, unknown>) {
  try {
    getPosthog()?.identify(distinctId, properties);
  } catch {
    /* ignore */
  }
}

export function resetPosthog() {
  try {
    getPosthog()?.reset();
  } catch {
    /* ignore */
  }
}
