'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { deletePublicSample } from '@/lib/samples/adminDelete';

export default function AdminSampleDeleteButton({
  sampleId,
  title,
  onDeleted,
  className = '',
}: {
  sampleId: string;
  title?: string;
  onDeleted?: (id: string) => void;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  if (!sampleId) return null;

  async function onDelete(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    const label = title?.trim() || 'this sample';
    if (!window.confirm(`Delete “${label}” from the site? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await deletePublicSample(sampleId);
      onDeleted?.(sampleId);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not delete.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      aria-label={`Delete ${title || 'sample'}`}
      disabled={busy}
      onClick={(event) => void onDelete(event)}
      onPointerDown={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full border border-rose-300/40 bg-black/75 text-rose-200 shadow-lg backdrop-blur-sm transition hover:bg-rose-500 hover:text-white disabled:opacity-50 ${className}`}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  );
}
