import connectDB from '@/lib/db/mongodb';
import { GenerationJob } from '@/lib/models';
import { reverseGenerationSpend, getSpendableCredits, type CreditSource } from '@/lib/users/wallet';
import type { VideoModel } from '@/lib/imageToVideo/types';

export type GenerationJobStatus = 'charged' | 'ingesting' | 'completed' | 'failed' | 'refunded';

export async function createChargedJob(input: {
  userId: string;
  mode: 'image' | 'video';
  cost: number;
  videoModel?: VideoModel | null;
  quality?: string;
  duration?: number | null;
  sourceKey?: string;
  paidWith?: CreditSource;
  locked?: boolean;
}) {
  await connectDB();
  return GenerationJob.create({
    userId: input.userId,
    mode: input.mode,
    cost: input.cost,
    videoModel: input.mode === 'video' ? input.videoModel || 'current' : null,
    quality: input.quality || '',
    duration: input.duration ?? null,
    sourceKey: input.sourceKey || '',
    paidWith: input.paidWith || 'paid',
    locked: Boolean(input.locked),
    status: 'charged',
  });
}

export async function attachJobTaskId(jobId: string, taskId: string) {
  await connectDB();
  await GenerationJob.findByIdAndUpdate(jobId, { $set: { taskId } });
}

export async function findOwnedJobByTaskId(userId: string, taskId: string) {
  await connectDB();
  return GenerationJob.findOne({ userId, taskId });
}

export async function markJobCompleted(jobId: string) {
  await connectDB();
  await GenerationJob.findByIdAndUpdate(jobId, { $set: { status: 'completed' } });
}

export async function claimJobForIngest(jobId: string) {
  await connectDB();
  return GenerationJob.findOneAndUpdate(
    {
      _id: jobId,
      $or: [
        { status: 'charged' },
        { status: 'ingesting', updatedAt: { $lt: new Date(Date.now() - 2 * 60 * 1000) } },
      ],
    },
    { $set: { status: 'ingesting' } },
    { new: true },
  );
}

export async function revertJobToCharged(jobId: string) {
  await connectDB();
  await GenerationJob.findByIdAndUpdate(jobId, { $set: { status: 'charged' } });
}

export async function completeLockedJob(
  jobId: string,
  fields: { outputKey: string; previewKey: string; generationId: string },
) {
  await connectDB();
  await GenerationJob.findByIdAndUpdate(jobId, {
    $set: {
      status: 'completed',
      locked: true,
      outputKey: fields.outputKey,
      previewKey: fields.previewKey,
      generationId: fields.generationId,
    },
  });
}

export async function refundChargedJob(input: {
  userId: string;
  jobId?: string;
  taskId?: string;
}): Promise<{ ok: boolean; desires?: number; error?: string }> {
  await connectDB();
  const filter: Record<string, unknown> = {
    userId: input.userId,
    status: 'charged',
  };
  if (input.jobId) filter._id = input.jobId;
  else if (input.taskId) filter.taskId = input.taskId;
  else return { ok: false, error: 'Missing job.' };

  const job = await GenerationJob.findOneAndUpdate(filter, { $set: { status: 'refunded' } });
  if (!job) return { ok: false, error: 'No refundable failed job.' };

  if (job.cost > 0) {
    await reverseGenerationSpend(input.userId, job.cost, (job.paidWith as CreditSource) || 'paid');
  }
  return { ok: true, desires: await getSpendableCredits(input.userId) };
}

export type ActiveGenerationJob = {
  taskId: string;
  mode: 'image' | 'video';
  videoModel: VideoModel | null;
  quality: string;
  duration: number | null;
  sourceKey: string;
  createdAt: Date;
};

export async function listActiveJobsForUser(userId: string): Promise<ActiveGenerationJob[]> {
  await connectDB();
  const cutoff = new Date(Date.now() - 45 * 60 * 1000);
  const rows = await GenerationJob.find({
    userId,
    status: { $in: ['charged', 'ingesting'] },
    taskId: { $type: 'string', $nin: [null, ''] },
    createdAt: { $gte: cutoff },
  })
    .sort({ createdAt: -1 })
    .limit(8)
    .select('taskId mode videoModel quality duration sourceKey createdAt')
    .lean();

  return rows.flatMap((row) => {
    const taskId = typeof row.taskId === 'string' ? row.taskId.trim() : '';
    if (!taskId) return [];
    return [
      {
        taskId,
        mode: row.mode === 'image' ? 'image' : 'video',
        videoModel: (row.videoModel as VideoModel | null) || null,
        quality: String(row.quality || ''),
        duration: typeof row.duration === 'number' ? row.duration : null,
        sourceKey: String(row.sourceKey || ''),
        createdAt: row.createdAt instanceof Date ? row.createdAt : new Date(),
      },
    ];
  });
}
