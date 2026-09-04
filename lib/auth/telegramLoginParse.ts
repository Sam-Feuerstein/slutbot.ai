const TELEGRAM_FIELD_ALIASES: Record<string, string> = {
  firstName: 'first_name',
  lastName: 'last_name',
  photoUrl: 'photo_url',
  authDate: 'auth_date',
};

function canonicalizeTelegramFields(raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    const canonical = TELEGRAM_FIELD_ALIASES[key] || key;
    if (value == null || value === '') continue;
    if (out[canonical] == null || out[canonical] === '') {
      out[canonical] = value;
    }
  }
  return out;
}

export function normalizeTelegramLoginParams(
  input: Record<string, unknown> | URLSearchParams,
): Record<string, string> | null {
  const raw: Record<string, unknown> = {};
  if (input instanceof URLSearchParams) {
    input.forEach((value, key) => {
      if (value) raw[key] = value;
    });
  } else {
    Object.assign(raw, input);
  }

  if (raw.user && typeof raw.user === 'object' && !Array.isArray(raw.user)) {
    Object.assign(raw, raw.user as Record<string, unknown>);
    delete raw.user;
  }

  const canonical = canonicalizeTelegramFields(raw);
  Object.keys(raw).forEach((key) => delete raw[key]);
  Object.assign(raw, canonical);

  const id = String(raw.id ?? '').trim();
  const hash = String(raw.hash ?? '').trim().toLowerCase();
  if (!/^\d{5,20}$/.test(id) || !/^[0-9a-f]{64}$/.test(hash)) return null;

  const out: Record<string, string> = { id, hash };
  for (const [key, value] of Object.entries(raw)) {
    if (key === 'id' || key === 'hash' || value == null || value === '') continue;
    out[key] = String(value);
  }
  return out;
}

export function parseTelegramAuthResult(encoded: string): Record<string, string> | null {
  const trimmed = encoded.trim();
  if (!trimmed) return null;

  const candidates = new Set<string>([trimmed, decodeURIComponent(trimmed)]);
  for (const candidate of candidates) {
    for (const value of [candidate, candidate.replace(/-/g, '+').replace(/_/g, '/')]) {
      const pad = (4 - (value.length % 4)) % 4;
      try {
        const json = JSON.parse(atob(value + '='.repeat(pad))) as Record<string, unknown>;
        const normalized = normalizeTelegramLoginParams(json);
        if (normalized) return normalized;
      } catch {
        /* try next decode strategy */
      }
      try {
        const json = JSON.parse(value) as Record<string, unknown>;
        const normalized = normalizeTelegramLoginParams(json);
        if (normalized) return normalized;
      } catch {
        /* try next decode strategy */
      }
    }
  }
  return null;
}

export function paramsFromTelegramLocation(search: string, hash: string): Record<string, string> | null {
  const query = normalizeTelegramLoginParams(new URLSearchParams(search));
  if (query) return query;

  const rawHash = hash.replace(/^#/, '');
  if (!rawHash) return null;

  if (rawHash.startsWith('{')) {
    try {
      return normalizeTelegramLoginParams(JSON.parse(rawHash) as Record<string, unknown>);
    } catch {
      return null;
    }
  }

  const hashParams = new URLSearchParams(rawHash);
  const fromHash = normalizeTelegramLoginParams(hashParams);
  if (fromHash) return fromHash;

  const tgAuthResult =
    hashParams.get('tgAuthResult') ||
    (rawHash.startsWith('tgAuthResult=') ? rawHash.slice('tgAuthResult='.length) : rawHash);
  return parseTelegramAuthResult(tgAuthResult);
}
