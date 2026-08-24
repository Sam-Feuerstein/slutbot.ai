import crypto from 'crypto';

export function sortObjectDeep(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(sortObjectDeep);
  if (obj && typeof obj === 'object') {
    return Object.keys(obj as Record<string, unknown>)
      .sort()
      .reduce((acc: Record<string, unknown>, key) => {
        acc[key] = sortObjectDeep((obj as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }
  return obj;
}

export function verifyNowPaymentsSignature(
  body: Record<string, unknown>,
  sigHeader: string | null,
  secret: string,
): boolean {
  if (!sigHeader || !secret) return false;
  const sorted = JSON.stringify(sortObjectDeep(body));
  const expected = crypto.createHmac('sha512', secret).update(sorted).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sigHeader));
  } catch {
    return false;
  }
}
