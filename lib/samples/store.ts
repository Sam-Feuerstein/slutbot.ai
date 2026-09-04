import connectDB from '@/lib/db/mongodb';
import { getExampleSourceThumb, PART_2_VIDEO_IDS } from '@/lib/exampleVideos';
import { PlatformSettings, SampleClick, SampleLike, SampleShowcase } from '@/lib/models';
import { seedSampleInputs } from './seed';
import type {
  PublicBeforeAfterSample,
  PublicExampleSample,
  PublicHeroDemo,
  SampleEngageAction,
  SampleInput,
  SampleKind,
  SampleMetrics,
  SampleRecord,
  SampleWithMetrics,
} from './types';

type SampleDoc = {
  sampleId?: string;
  kind?: SampleKind;
  title?: string;
  posterUrl?: string;
  videoUrl?: string;
  sourceUrl?: string;
  beforeUrl?: string;
  afterUrl?: string;
  combinedUrl?: string;
  sortOrder?: number;
  enabled?: boolean;
  pinned?: boolean;
  heroSlot?: number;
  createdAt?: Date;
  updatedAt?: Date;
};

let seedPromise: Promise<void> | null = null;

function clip(value: unknown, max = 240): string {
  return String(value ?? '')
    .trim()
    .slice(0, max);
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function normalizeHeroSlot(value: unknown): 0 | 1 | 2 {
  const n = Math.round(Number(value) || 0);
  if (n === 1 || n === 2) return n;
  return 0;
}

function toRecord(doc: SampleDoc): SampleRecord {
  return {
    id: String(doc.sampleId || ''),
    kind: doc.kind === 'before_after' ? 'before_after' : 'example',
    title: clip(doc.title || 'Sample', 80) || 'Sample',
    posterUrl: clip(doc.posterUrl || '', 500),
    videoUrl: clip(doc.videoUrl || '', 500),
    sourceUrl: clip(doc.sourceUrl || '', 500),
    beforeUrl: clip(doc.beforeUrl || '', 500),
    afterUrl: clip(doc.afterUrl || '', 500),
    combinedUrl: clip(doc.combinedUrl || '', 500),
    sortOrder: Number.isFinite(Number(doc.sortOrder)) ? Number(doc.sortOrder) : 0,
    enabled: doc.enabled !== false,
    pinned: Boolean(doc.pinned),
    heroSlot: normalizeHeroSlot(doc.heroSlot),
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date().toISOString(),
  };
}

function validateInput(input: SampleInput): void {
  if (input.kind !== 'example' && input.kind !== 'before_after') {
    throw new Error('kind must be example or before_after.');
  }
  if (input.kind === 'example') {
    if (!clip(input.posterUrl || '')) throw new Error('posterUrl is required for example samples.');
  } else if (!clip(input.beforeUrl || '') || !clip(input.afterUrl || '')) {
    throw new Error('beforeUrl and afterUrl are required for before/after samples.');
  }
}

async function markSamplesSeeded() {
  await PlatformSettings.collection.updateOne(
    { key: 'platform' },
    { $set: { samplesSeeded: true } },
    { upsert: true },
  );
}

async function syncExistingPart2Media() {
  const { EXAMPLE_VIDEOS } = await import('@/lib/exampleVideos');
  const part2Set = new Set<string>(PART_2_VIDEO_IDS);
  const part2 = EXAMPLE_VIDEOS.filter((row) => part2Set.has(row.id as typeof PART_2_VIDEO_IDS[number]));

  for (let i = 0; i < part2.length; i++) {
    const row = part2[i];
    // Update media only if the card still exists. Never recreate a deleted sample.
    await SampleShowcase.updateOne(
      { sampleId: row.id },
      {
        $set: {
          kind: 'example',
          posterUrl: row.poster,
          videoUrl: row.video || '',
          sourceUrl: row.source || getExampleSourceThumb(row.id, Boolean(row.video)) || '',
        },
      },
    );
  }
}

async function ensureSeeded() {
  if (!seedPromise) {
    seedPromise = (async () => {
      await connectDB();
      const settings = (await PlatformSettings.findOne({ key: 'platform' }).lean()) as {
        samplesSeeded?: boolean;
      } | null;
      const alreadySeeded = Boolean(settings?.samplesSeeded);
      const count = await SampleShowcase.countDocuments();

      if (!alreadySeeded && count === 0) {
        const seeds = seedSampleInputs();
        if (seeds.length) {
          await SampleShowcase.insertMany(
            seeds.map((row) => ({
              sampleId: row.id,
              kind: row.kind,
              title: row.title || 'Sample',
              posterUrl: row.posterUrl || '',
              videoUrl: row.videoUrl || '',
              sourceUrl: row.sourceUrl || '',
              beforeUrl: row.beforeUrl || '',
              afterUrl: row.afterUrl || '',
              combinedUrl: row.combinedUrl || '',
              sortOrder: row.sortOrder ?? 0,
              enabled: row.enabled !== false,
              pinned: Boolean(row.pinned),
              heroSlot: normalizeHeroSlot(row.heroSlot),
            })),
            { ordered: false },
          ).catch(() => undefined);
        }
        await markSamplesSeeded();
      } else if (!alreadySeeded) {
        await markSamplesSeeded();
      }

      await syncExistingPart2Media();
    })().catch((err) => {
      seedPromise = null;
      throw err;
    });
  }
  await seedPromise;
}

export async function listSamples(kind?: SampleKind): Promise<SampleRecord[]> {
  await ensureSeeded();
  const filter = kind ? { kind } : {};
  const rows = (await SampleShowcase.find(filter).sort({ sortOrder: 1, createdAt: 1 }).lean()) as SampleDoc[];
  return rows.map(toRecord);
}

export async function listPublicExamples(): Promise<PublicExampleSample[]> {
  const rows = await listSamples('example');
  const enabled = rows.filter((row) => row.enabled);
  const likeCounts = await likeCountsFor(enabled.map((row) => row.id));
  const part2Set = new Set<string>(PART_2_VIDEO_IDS);
  const leading = PART_2_VIDEO_IDS
    .map((id) => enabled.find((row) => row.id === id))
    .filter((row): row is SampleRecord => Boolean(row));
  const pinned = enabled.filter((row) => row.pinned && !part2Set.has(row.id));
  const rest = enabled.filter((row) => !row.pinned && !part2Set.has(row.id));
  return [...leading, ...pinned, ...rest].map((row) => ({
    id: row.id,
    title: row.title,
    poster: row.posterUrl,
    video: row.videoUrl || undefined,
    source: row.sourceUrl || getExampleSourceThumb(row.id, Boolean(row.videoUrl)),
    likeCount: likeCounts.get(row.id) || 0,
  }));
}

export async function listPublicBeforeAfter(): Promise<PublicBeforeAfterSample[]> {
  const rows = await listSamples('before_after');
  const enabled = rows.filter((row) => row.enabled);
  const likeCounts = await likeCountsFor(enabled.map((row) => row.id));
  return enabled.map((row) => ({
    id: row.id,
    before: row.beforeUrl,
    after: row.afterUrl,
    combined: row.combinedUrl || undefined,
    likeCount: likeCounts.get(row.id) || 0,
  }));
}

function toHeroDemo(row: SampleDoc): PublicHeroDemo {
  return {
    id: String(row.sampleId || ''),
    poster: clip(row.posterUrl || '', 500),
    video: clip(row.videoUrl || '', 500) || undefined,
  };
}

export async function listHeroDemos(): Promise<[PublicHeroDemo, PublicHeroDemo]> {
  await ensureSeeded();
  const rows = (await SampleShowcase.find({
    kind: 'example',
    enabled: true,
  })
    .sort({ sortOrder: 1, createdAt: 1 })
    .lean()) as SampleDoc[];

  const bySlot = new Map<number, SampleDoc>();
  for (const row of rows) {
    const slot = normalizeHeroSlot(row.heroSlot);
    if (slot && row.posterUrl && !bySlot.has(slot)) bySlot.set(slot, row);
  }

  const used = new Set<string>();
  const pick = (slot: 1 | 2): PublicHeroDemo => {
    const assigned = bySlot.get(slot);
    if (assigned?.posterUrl) {
      used.add(String(assigned.sampleId || ''));
      return toHeroDemo(assigned);
    }
    const next = rows.find((row) => row.posterUrl && !used.has(String(row.sampleId || '')));
    if (!next) return { id: '', poster: '', video: undefined };
    used.add(String(next.sampleId || ''));
    return toHeroDemo(next);
  };

  return [pick(1), pick(2)];
}

/** Assign which example samples appear in the homepage hero (left=1, right=2). */
export async function setHeroSlots(slot1Id: string, slot2Id: string): Promise<SampleRecord[]> {
  await ensureSeeded();
  const left = clip(slot1Id, 80);
  const right = clip(slot2Id, 80);
  if (!left || !right) throw new Error('Both hero slots require a sample.');
  if (left === right) throw new Error('Pick two different samples for the hero.');

  const [a, b] = await Promise.all([
    SampleShowcase.findOne({ sampleId: left, kind: 'example' }).lean(),
    SampleShowcase.findOne({ sampleId: right, kind: 'example' }).lean(),
  ]);
  if (!a || !b) throw new Error('Hero samples must be existing example cards.');
  if ((a as SampleDoc).enabled === false || (b as SampleDoc).enabled === false) {
    throw new Error('Hero samples must be visible (enabled).');
  }

  await SampleShowcase.updateMany({ heroSlot: { $in: [1, 2] } }, { $set: { heroSlot: 0 } });
  await Promise.all([
    SampleShowcase.updateOne({ sampleId: left }, { $set: { heroSlot: 1 } }),
    SampleShowcase.updateOne({ sampleId: right }, { $set: { heroSlot: 2 } }),
  ]);
  return listSamples('example');
}

async function likeCountsFor(sampleIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (!sampleIds.length) return map;
  await connectDB();
  const rows = (await SampleLike.aggregate([
    { $match: { sampleId: { $in: sampleIds } } },
    { $group: { _id: '$sampleId', count: { $sum: 1 } } },
  ])) as Array<{ _id?: string; count?: number }>;
  for (const row of rows) {
    if (row._id) map.set(row._id, Math.max(0, Math.round(row.count || 0)));
  }
  return map;
}

export async function getLikedSampleIds(clientId: string): Promise<string[]> {
  const id = clip(clientId, 80);
  if (!id) return [];
  await connectDB();
  const rows = (await SampleLike.find({ clientId: id }).select('sampleId').lean()) as Array<{
    sampleId?: string;
  }>;
  return rows.map((row) => String(row.sampleId || '')).filter(Boolean);
}

export async function upsertSample(input: SampleInput): Promise<SampleRecord> {
  await ensureSeeded();
  validateInput(input);

  const existingId = clip(input.id || '', 80);
  let sampleId = existingId;
  if (!sampleId) {
    const base = slugify(input.title || input.kind) || input.kind;
    sampleId = `${base}-${Date.now().toString(36)}`;
  }

  const maxOrder = await SampleShowcase.findOne({ kind: input.kind })
    .sort({ sortOrder: -1 })
    .select('sortOrder')
    .lean();
  const nextOrder =
    input.sortOrder ??
    (existingId
      ? undefined
      : Number((maxOrder as { sortOrder?: number } | null)?.sortOrder || 0) + 1);

  const update: Record<string, unknown> = {
    kind: input.kind,
    title: clip(input.title || 'Sample', 80) || 'Sample',
    posterUrl: clip(input.posterUrl || '', 500),
    videoUrl: clip(input.videoUrl || '', 500),
    sourceUrl: clip(input.sourceUrl || '', 500),
    beforeUrl: clip(input.beforeUrl || '', 500),
    afterUrl: clip(input.afterUrl || '', 500),
    combinedUrl: clip(input.combinedUrl || '', 500),
    enabled: input.enabled !== false,
    pinned: Boolean(input.pinned),
  };
  if (typeof nextOrder === 'number') update.sortOrder = nextOrder;
  if (typeof input.sortOrder === 'number') update.sortOrder = input.sortOrder;
  if (input.heroSlot !== undefined) {
    const slot = normalizeHeroSlot(input.heroSlot);
    update.heroSlot = slot;
    if (slot && input.kind === 'example') {
      await SampleShowcase.updateMany(
        { heroSlot: slot, sampleId: { $ne: sampleId } },
        { $set: { heroSlot: 0 } },
      );
    }
  }

  const doc = (await SampleShowcase.findOneAndUpdate(
    { sampleId },
    { $set: update, $setOnInsert: { sampleId, heroSlot: normalizeHeroSlot(input.heroSlot) } },
    { upsert: true, new: true },
  ).lean()) as SampleDoc | null;

  if (!doc) throw new Error('Could not save sample.');
  return toRecord(doc);
}

export async function deleteSample(id: string): Promise<void> {
  await connectDB();
  const sampleId = clip(id, 80);
  if (!sampleId) throw new Error('Sample id is required.');
  const deleted = await SampleShowcase.findOneAndDelete({ sampleId });
  if (!deleted) throw new Error('Sample not found.');
  await Promise.all([
    SampleLike.deleteMany({ sampleId }),
    SampleClick.deleteMany({ sampleId }),
  ]);
  // Next list must re-check seed logic in this process (same as a fresh serverless isolate).
  seedPromise = null;
}

export async function setSampleEnabled(id: string, enabled: boolean): Promise<SampleRecord> {
  await connectDB();
  const doc = (await SampleShowcase.findOneAndUpdate(
    { sampleId: clip(id, 80) },
    { $set: { enabled: Boolean(enabled) } },
    { new: true },
  ).lean()) as SampleDoc | null;
  if (!doc) throw new Error('Sample not found.');
  return toRecord(doc);
}

/** Set homepage hero slot for one example card (0 = not in hero). */
export async function setSampleHeroSlot(id: string, slot: 0 | 1 | 2): Promise<SampleRecord> {
  await ensureSeeded();
  const sampleId = clip(id, 80);
  if (!sampleId) throw new Error('Sample id is required.');

  const existing = (await SampleShowcase.findOne({ sampleId }).lean()) as SampleDoc | null;
  if (!existing) throw new Error('Sample not found.');
  if (existing.kind !== 'example') throw new Error('Only example cards can be hero demos.');

  const heroSlot = normalizeHeroSlot(slot);
  if (heroSlot && existing.enabled === false) {
    throw new Error('Enable the sample before assigning a hero slot.');
  }

  if (heroSlot) {
    await SampleShowcase.updateMany(
      { heroSlot, sampleId: { $ne: sampleId } },
      { $set: { heroSlot: 0 } },
    );
  }

  const doc = (await SampleShowcase.findOneAndUpdate(
    { sampleId },
    { $set: { heroSlot } },
    { new: true },
  ).lean()) as SampleDoc | null;
  if (!doc) throw new Error('Sample not found.');
  return toRecord(doc);
}

type SampleAssetPatch = Partial<
  Pick<SampleInput, 'posterUrl' | 'videoUrl' | 'sourceUrl' | 'beforeUrl' | 'afterUrl' | 'combinedUrl'>
>;

export async function patchSampleAssets(id: string, patch: SampleAssetPatch): Promise<SampleRecord> {
  await connectDB();
  const sampleId = clip(id, 80);
  if (!sampleId) throw new Error('Sample id is required.');

  const existing = (await SampleShowcase.findOne({ sampleId }).lean()) as SampleDoc | null;
  if (!existing) throw new Error('Sample not found.');

  const update: Record<string, string> = {};
  if (patch.posterUrl !== undefined) update.posterUrl = clip(patch.posterUrl, 500);
  if (patch.videoUrl !== undefined) update.videoUrl = clip(patch.videoUrl, 500);
  if (patch.sourceUrl !== undefined) update.sourceUrl = clip(patch.sourceUrl, 500);
  if (patch.beforeUrl !== undefined) update.beforeUrl = clip(patch.beforeUrl, 500);
  if (patch.afterUrl !== undefined) update.afterUrl = clip(patch.afterUrl, 500);
  if (patch.combinedUrl !== undefined) update.combinedUrl = clip(patch.combinedUrl, 500);
  if (!Object.keys(update).length) throw new Error('No asset fields to update.');

  const kind = existing.kind === 'before_after' ? 'before_after' : 'example';
  const posterUrl = update.posterUrl ?? clip(existing.posterUrl || '', 500);
  const beforeUrl = update.beforeUrl ?? clip(existing.beforeUrl || '', 500);
  const afterUrl = update.afterUrl ?? clip(existing.afterUrl || '', 500);
  if (kind === 'example' && !posterUrl) {
    throw new Error('posterUrl is required for example samples.');
  }
  if (kind === 'before_after' && (!beforeUrl || !afterUrl)) {
    throw new Error('beforeUrl and afterUrl are required for before/after samples.');
  }

  const doc = (await SampleShowcase.findOneAndUpdate(
    { sampleId },
    { $set: update },
    { new: true },
  ).lean()) as SampleDoc | null;
  if (!doc) throw new Error('Sample not found.');
  return toRecord(doc);
}

export async function reorderSamples(kind: SampleKind, orderedIds: string[]): Promise<SampleRecord[]> {
  await ensureSeeded();
  if (kind !== 'example' && kind !== 'before_after') throw new Error('Invalid kind.');
  const ids = orderedIds.map((id) => clip(id, 80)).filter(Boolean);
  if (!ids.length) throw new Error('orderedIds is required.');

  await Promise.all(
    ids.map((sampleId, index) =>
      SampleShowcase.updateOne({ sampleId, kind }, { $set: { sortOrder: index } }),
    ),
  );
  return listSamples(kind);
}

export async function recordSampleEngage(input: {
  sampleId: string;
  action: SampleEngageAction;
  clientId?: string;
  country?: string;
}): Promise<{ liked: boolean; likeCount: number }> {
  await connectDB();
  const sampleId = clip(input.sampleId, 80);
  const clientId = clip(input.clientId || '', 80);
  const country = clip(input.country || '', 2).toUpperCase();
  if (!sampleId) throw new Error('sampleId is required.');

  const exists = await SampleShowcase.exists({ sampleId, enabled: true });
  if (!exists) throw new Error('Sample not found.');

  if (input.action === 'click') {
    await SampleClick.create({ sampleId, clientId, country });
    const likeCount = await SampleLike.countDocuments({ sampleId });
    const liked = clientId ? Boolean(await SampleLike.exists({ sampleId, clientId })) : false;
    return { liked, likeCount };
  }

  if (!clientId) throw new Error('clientId is required to like.');

  if (input.action === 'unlike') {
    await SampleLike.deleteOne({ sampleId, clientId });
  } else {
    await SampleLike.updateOne(
      { sampleId, clientId },
      { $setOnInsert: { sampleId, clientId, country } },
      { upsert: true },
    );
  }

  const likeCount = await SampleLike.countDocuments({ sampleId });
  const liked = Boolean(await SampleLike.exists({ sampleId, clientId }));
  return { liked, likeCount };
}

type AggRow = { _id: { sampleId?: string; country?: string }; count?: number };

async function countBySampleSince(
  model: typeof SampleClick | typeof SampleLike,
  since: Date | null,
  sampleIds: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (!sampleIds.length) return map;
  const match: Record<string, unknown> = { sampleId: { $in: sampleIds } };
  if (since) match.createdAt = { $gte: since };
  const rows = (await model.aggregate([
    { $match: match },
    { $group: { _id: '$sampleId', count: { $sum: 1 } } },
  ])) as Array<{ _id?: string; count?: number }>;
  for (const row of rows) {
    if (row._id) map.set(row._id, Math.max(0, Math.round(row.count || 0)));
  }
  return map;
}

async function countryBreakdown(sampleIds: string[]): Promise<Map<string, SampleMetrics['byCountry']>> {
  const map = new Map<string, SampleMetrics['byCountry']>();
  if (!sampleIds.length) return map;

  const [clickRows, likeRows] = await Promise.all([
    SampleClick.aggregate([
      { $match: { sampleId: { $in: sampleIds }, country: { $ne: '' } } },
      { $group: { _id: { sampleId: '$sampleId', country: '$country' }, count: { $sum: 1 } } },
    ]) as Promise<AggRow[]>,
    SampleLike.aggregate([
      { $match: { sampleId: { $in: sampleIds }, country: { $ne: '' } } },
      { $group: { _id: { sampleId: '$sampleId', country: '$country' }, count: { $sum: 1 } } },
    ]) as Promise<AggRow[]>,
  ]);

  const scratch = new Map<string, Map<string, { clicks: number; likes: number }>>();
  const touch = (sampleId: string, country: string) => {
    if (!scratch.has(sampleId)) scratch.set(sampleId, new Map());
    const countries = scratch.get(sampleId)!;
    if (!countries.has(country)) countries.set(country, { clicks: 0, likes: 0 });
    return countries.get(country)!;
  };

  for (const row of clickRows) {
    const sampleId = row._id?.sampleId;
    const country = row._id?.country;
    if (!sampleId || !country) continue;
    touch(sampleId, country).clicks += Math.max(0, Math.round(row.count || 0));
  }
  for (const row of likeRows) {
    const sampleId = row._id?.sampleId;
    const country = row._id?.country;
    if (!sampleId || !country) continue;
    touch(sampleId, country).likes += Math.max(0, Math.round(row.count || 0));
  }

  for (const [sampleId, countries] of scratch) {
    const list = [...countries.entries()]
      .map(([country, stats]) => ({ country, clicks: stats.clicks, likes: stats.likes }))
      .sort((a, b) => b.likes + b.clicks - (a.likes + a.clicks))
      .slice(0, 12);
    map.set(sampleId, list);
  }
  return map;
}

export async function listSamplesWithMetrics(kind?: SampleKind): Promise<SampleWithMetrics[]> {
  const samples = await listSamples(kind);
  const ids = samples.map((row) => row.id);
  const now = Date.now();
  const since24h = new Date(now - 24 * 60 * 60 * 1000);
  const since7d = new Date(now - 7 * 24 * 60 * 60 * 1000);

  const [clicks24h, clicks7d, clicksTotal, likes24h, likes7d, likesTotal, byCountry] =
    await Promise.all([
      countBySampleSince(SampleClick, since24h, ids),
      countBySampleSince(SampleClick, since7d, ids),
      countBySampleSince(SampleClick, null, ids),
      countBySampleSince(SampleLike, since24h, ids),
      countBySampleSince(SampleLike, since7d, ids),
      countBySampleSince(SampleLike, null, ids),
      countryBreakdown(ids),
    ]);

  return samples.map((sample) => ({
    ...sample,
    metrics: {
      clicks24h: clicks24h.get(sample.id) || 0,
      clicks7d: clicks7d.get(sample.id) || 0,
      clicksTotal: clicksTotal.get(sample.id) || 0,
      likes24h: likes24h.get(sample.id) || 0,
      likes7d: likes7d.get(sample.id) || 0,
      likesTotal: likesTotal.get(sample.id) || 0,
      byCountry: byCountry.get(sample.id) || [],
    },
  }));
}
