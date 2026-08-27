import { displayMediaUrl } from '@/lib/media/sign';

type GenerationOutputFields = {
  locked?: boolean;
  outputKey?: string;
  previewKey?: string;
  outputUrl?: string;
};

/** Client-facing media URL. Locked videos never resolve to the original key. */
export function publicGenerationOutput(doc: GenerationOutputFields): { outputUrl: string; locked: boolean } {
  const locked = Boolean(doc.locked);
  if (locked) {
    const preview = (doc.previewKey || '').trim();
    if (preview) return { outputUrl: displayMediaUrl(preview), locked: true };
    const stored = String(doc.outputUrl || '');
    if (stored.startsWith('r2:image-to-video/previews/')) {
      return { outputUrl: displayMediaUrl(stored), locked: true };
    }
    return { outputUrl: '', locked: true };
  }

  const original = (doc.outputKey || '').trim();
  if (original) return { outputUrl: displayMediaUrl(original), locked: false };
  return { outputUrl: displayMediaUrl(String(doc.outputUrl || '')), locked: false };
}
