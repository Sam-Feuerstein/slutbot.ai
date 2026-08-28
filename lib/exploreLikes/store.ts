import connectDB from '@/lib/db/mongodb';
import { getHomePresetById, getHomePresetIds } from '@/lib/homePresets';
import { PresetLike } from '@/lib/models';
import { displayPresetLikeCount } from './seed';

function clip(value: unknown, max = 80): string {
  return String(value ?? '')
    .trim()
    .slice(0, max);
}

export async function getLikedPresetIds(clientId: string): Promise<string[]> {
  const id = clip(clientId, 80);
  if (!id) return [];
  await connectDB();
  const rows = (await PresetLike.find({ clientId: id }).select('presetId').lean()) as Array<{
    presetId?: string;
  }>;
  return rows.map((row) => String(row.presetId || '')).filter(Boolean);
}

export async function getPresetRealLikeCounts(): Promise<Record<string, number>> {
  await connectDB();
  const presetIds = getHomePresetIds();
  const rows = (await PresetLike.aggregate([
    { $match: { presetId: { $in: presetIds } } },
    { $group: { _id: '$presetId', count: { $sum: 1 } } },
  ])) as Array<{ _id?: string; count?: number }>;

  const map: Record<string, number> = {};
  for (const id of presetIds) map[id] = 0;
  for (const row of rows) {
    if (row._id) map[row._id] = Math.max(0, Math.round(row.count || 0));
  }
  return map;
}

export async function getExploreLikeSnapshot(clientId: string): Promise<{
  likedIds: string[];
  realCounts: Record<string, number>;
  displayCounts: Record<string, number>;
}> {
  const [likedIds, realCounts] = await Promise.all([
    getLikedPresetIds(clientId),
    getPresetRealLikeCounts(),
  ]);
  const displayCounts: Record<string, number> = {};
  for (const [presetId, real] of Object.entries(realCounts)) {
    displayCounts[presetId] = displayPresetLikeCount(presetId, real);
  }
  return { likedIds, realCounts, displayCounts };
}

export async function recordPresetLike(input: {
  presetId: string;
  action: 'like' | 'unlike';
  clientId: string;
  country?: string;
}): Promise<{ liked: boolean; realCount: number; displayCount: number }> {
  const presetId = clip(input.presetId, 80);
  const clientId = clip(input.clientId, 80);
  const country = clip(input.country || '', 2).toUpperCase();

  if (!presetId || !getHomePresetById(presetId)) {
    throw new Error('Preset not found.');
  }
  if (!clientId) throw new Error('clientId is required to like.');

  await connectDB();

  if (input.action === 'unlike') {
    await PresetLike.deleteOne({ presetId, clientId });
  } else {
    await PresetLike.updateOne(
      { presetId, clientId },
      { $setOnInsert: { presetId, clientId, country } },
      { upsert: true },
    );
  }

  const realCount = await PresetLike.countDocuments({ presetId });
  const liked = Boolean(await PresetLike.exists({ presetId, clientId }));
  return {
    liked,
    realCount,
    displayCount: displayPresetLikeCount(presetId, realCount),
  };
}
