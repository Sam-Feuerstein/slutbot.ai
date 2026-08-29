import type { AiToolGenerationRecord } from '@/lib/imageToVideo/types';
import { readCachedUserProfile } from '@/lib/auth/profile';

// Legacy GLOBAL key. This leaked generations across accounts on a shared
// browser because it was not scoped to a user. We now purge it on every read
// and never write to it again.
const LEGACY_GLOBAL_KEY = 'slutbot-collection';
const KEY_PREFIX = 'slutbot-collection:';

function currentOwnerKey(): string | null {
  if (typeof window === 'undefined') return null;
  const email = readCachedUserProfile()?.email?.trim().toLowerCase();
  if (!email) return null;
  return `${KEY_PREFIX}${email}`;
}

// Remove the old global cache so previously-leaked data is wiped everywhere.
function purgeLegacyGlobal() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(LEGACY_GLOBAL_KEY);
  } catch {
    // ignore
  }
}

/** Wipe legacy global + every per-user collection cache from this browser. */
export function purgeAllLocalCollectionCaches() {
  if (typeof window === 'undefined') return;
  purgeLegacyGlobal();
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const storageKey = localStorage.key(i);
      if (storageKey && (storageKey === LEGACY_GLOBAL_KEY || storageKey.startsWith(KEY_PREFIX))) {
        keys.push(storageKey);
      }
    }
    keys.forEach((storageKey) => localStorage.removeItem(storageKey));
  } catch {
    // ignore
  }
}

export function readLocalCollection(): AiToolGenerationRecord[] {
  if (typeof window === 'undefined') return [];
  purgeLegacyGlobal();
  const key = currentOwnerKey();
  if (!key) return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AiToolGenerationRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeLocalCollection(items: AiToolGenerationRecord[]) {
  if (typeof window === 'undefined') return;
  purgeLegacyGlobal();
  const key = currentOwnerKey();
  if (!key) return;
  localStorage.setItem(key, JSON.stringify(items.slice(0, 100)));
}

export function addLocalCollectionItem(item: AiToolGenerationRecord) {
  const items = readLocalCollection().filter((entry) => entry.id !== item.id && entry.outputUrl !== item.outputUrl);
  writeLocalCollection([item, ...items]);
}

export function removeLocalCollectionItem(id: string, outputUrl?: string) {
  writeLocalCollection(
    readLocalCollection().filter((entry) => entry.id !== id && (!outputUrl || entry.outputUrl !== outputUrl)),
  );
}

export function mergeCollection(
  remote: AiToolGenerationRecord[],
  local: AiToolGenerationRecord[],
): AiToolGenerationRecord[] {
  const seen = new Set<string>();
  const merged: AiToolGenerationRecord[] = [];
  for (const item of [...remote, ...local]) {
    const key = item.id || item.outputUrl;
    if (!key || seen.has(key) || seen.has(item.outputUrl)) continue;
    seen.add(item.id);
    seen.add(item.outputUrl);
    merged.push(item);
  }
  return merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function downloadResult(url: string, filename: string) {
  try {
    const res = await fetch(url, { credentials: 'include' });
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(objectUrl);
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
