import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { adminSessionOk } from '@/lib/auth/adminSession';
import {
  deleteSample,
  listSamplesWithMetrics,
  patchSampleAssets,
  reorderSamples,
  setHeroSlots,
  setSampleEnabled,
  setSampleHeroSlot,
  upsertSample,
  type SampleInput,
  type SampleKind,
} from '@/lib/samples';

export const dynamic = 'force-dynamic';

async function denyAdmin(req: NextRequest) {
  if (!(await adminSessionOk(req))) {
    return NextResponse.json({ message: 'Admin login required.' }, { status: 401 });
  }
  return null;
}

// The homepage renders samples/hero/before-after and is ISR-cached. Refresh it
// immediately whenever an admin changes samples so edits appear without waiting
// for the revalidate window.
function revalidateSamplePages() {
  try {
    revalidatePath('/');
  } catch {
    /* revalidation is best-effort */
  }
}

export async function GET(req: NextRequest) {
  const denied = await denyAdmin(req);
  if (denied) return denied;
  const kind = req.nextUrl.searchParams.get('kind') as SampleKind | null;
  try {
    const samples = await listSamplesWithMetrics(
      kind === 'example' || kind === 'before_after' ? kind : undefined,
    );
    return NextResponse.json({ samples });
  } catch (err) {
    console.error('Admin samples list error:', err);
    return NextResponse.json({ message: 'Could not load samples.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const denied = await denyAdmin(req);
  if (denied) return denied;
  const body = (await req.json().catch(() => null)) as SampleInput | null;
  if (!body?.kind) {
    return NextResponse.json({ message: 'kind is required.' }, { status: 400 });
  }
  try {
    const sample = await upsertSample(body);
    revalidateSamplePages();
    return NextResponse.json({ sample });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not save sample.';
    return NextResponse.json({ message }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  const denied = await denyAdmin(req);
  if (denied) return denied;
  const body = (await req.json().catch(() => null)) as
    | {
        id?: string;
        enabled?: boolean;
        kind?: SampleKind;
        orderedIds?: string[];
        heroSlots?: { slot1?: string; slot2?: string };
        posterUrl?: string;
        videoUrl?: string;
        sourceUrl?: string;
        beforeUrl?: string;
        afterUrl?: string;
        combinedUrl?: string;
        heroSlot?: 0 | 1 | 2;
      }
    | null;

  const assetFields = ['posterUrl', 'videoUrl', 'sourceUrl', 'beforeUrl', 'afterUrl', 'combinedUrl'] as const;
  if (body?.id && assetFields.some((key) => body[key] !== undefined)) {
    try {
      const patch: Record<string, string> = {};
      for (const key of assetFields) {
        if (body[key] !== undefined) patch[key] = String(body[key] ?? '');
      }
      const sample = await patchSampleAssets(body.id, patch);
      revalidateSamplePages();
      return NextResponse.json({ sample });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not update assets.';
      return NextResponse.json({ message }, { status: 400 });
    }
  }

  if (body?.id && body.heroSlot !== undefined) {
    const slot = Math.round(Number(body.heroSlot));
    if (slot !== 0 && slot !== 1 && slot !== 2) {
      return NextResponse.json({ message: 'heroSlot must be 0, 1, or 2.' }, { status: 400 });
    }
    try {
      const sample = await setSampleHeroSlot(body.id, slot as 0 | 1 | 2);
      revalidateSamplePages();
      return NextResponse.json({ sample });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not update hero slot.';
      return NextResponse.json({ message }, { status: 400 });
    }
  }

  if (body?.heroSlots) {
    try {
      const samples = await setHeroSlots(body.heroSlots.slot1 || '', body.heroSlots.slot2 || '');
      revalidateSamplePages();
      return NextResponse.json({ samples });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not update hero.';
      return NextResponse.json({ message }, { status: 400 });
    }
  }

  if (body?.kind && Array.isArray(body.orderedIds)) {
    try {
      const samples = await reorderSamples(body.kind, body.orderedIds);
      revalidateSamplePages();
      return NextResponse.json({ samples });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not reorder.';
      return NextResponse.json({ message }, { status: 400 });
    }
  }

  if (!body?.id || typeof body.enabled !== 'boolean') {
    return NextResponse.json({ message: 'id and enabled are required.' }, { status: 400 });
  }
  try {
    const sample = await setSampleEnabled(body.id, body.enabled);
    revalidateSamplePages();
    return NextResponse.json({ sample });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not update sample.';
    return NextResponse.json({ message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const denied = await denyAdmin(req);
  if (denied) return denied;
  const id = req.nextUrl.searchParams.get('id')?.trim() || '';
  if (!id) return NextResponse.json({ message: 'Sample id is required.' }, { status: 400 });
  try {
    await deleteSample(id);
    revalidateSamplePages();
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not delete sample.';
    return NextResponse.json({ message }, { status: 400 });
  }
}
