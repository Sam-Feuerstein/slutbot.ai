import type { AiToolGenerationRecord } from '@/lib/imageToVideo/types';

const KEY = 'slutbot-collection';

export function readLocalCollection(): AiToolGenerationRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AiToolGenerationRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeLocalCollection(items: AiToolGenerationRecord[]) {
  localStorage.setItem(KEY, JSON.stringify(items.slice(0, 100)));
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
    const res = await fetch(url);
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
