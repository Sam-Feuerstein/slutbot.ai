export const SAMPLE_DELETED_EVENT = 'slutbot:sample-deleted';

export async function deletePublicSample(sampleId: string) {
  const id = sampleId.trim();
  if (!id) throw new Error('Sample id is required.');

  const res = await fetch(`/api/admin/samples?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
    credentials: 'same-origin',
    cache: 'no-store',
  });
  if (!res.ok) {
    const json = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(json?.message || 'Could not delete.');
  }

  window.dispatchEvent(new CustomEvent(SAMPLE_DELETED_EVENT, { detail: { id } }));
}
