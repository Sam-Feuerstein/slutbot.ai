import connectDB from '@/lib/db/mongodb';
import { GenerationJob } from '@/lib/models';
import { adjustUserDesires, getUserDesires } from '@/lib/users/wallet';
import type { VideoModel } from '@/lib/imageToVideo/types';

export type GenerationJobStatus = 'charged' | 'completed' | 'failed' | 'refunded';

export async function createChargedJob(input: {
  userId: string;
  mode: 'image' | 'video';
  cost: number;
  videoModel?: VideoModel | null;
  quality?: string;
  duration?: number | null;
  sourceKey?: string;
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

export async function refundChargedJob(input: {
  userId: string;
  jobId?: string;
  taskId?: string;
}): Promise<{ ok: boolean; desires?: number; error?: string }> {
  await connectDB();
  const filter: Record<string, unknown> = { userId: input.userId, status: 'charged' };
  if (input.jobId) filter._id = input.jobId;
  else if (input.taskId) filter.taskId = input.taskId;
  else return { ok: false, error: 'Missing job.' };

  const job = await GenerationJob.findOneAndUpdate(filter, { $set: { status: 'refunded' } });
  if (!job) return { ok: false, error: 'No refundable failed job.' };

  if (job.cost > 0) {
    await adjustUserDesires(input.userId, job.cost);
  }
  return { ok: true, desires: await getUserDesires(input.userId) };
}
