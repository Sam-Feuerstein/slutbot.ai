import type { NextRequest } from 'next/server';

type Bucket = { count: number; start: number };

const stores = new Map<string, Map<string, Bucket>>();

export function rateLimitAllowed(input: {
  name: string;
  key: string;
  windowMs: number;
  max: number;
}): boolean {
  let buckets = stores.get(input.name);
  if (!buckets) {
    buckets = new Map();
    stores.set(input.name, buckets);
  }

  const now = Date.now();
  const current = buckets.get(input.key);
  if (!current || now - current.start > input.windowMs) {
    buckets.set(input.key, { count: 1, start: now });
    return true;
  }
  if (current.count >= input.max) return false;
  current.count += 1;
  return true;
}

export function clientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'local'
  );
}
