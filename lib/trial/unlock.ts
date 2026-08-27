import connectDB from '@/lib/db/mongodb';
import { AiToolGeneration } from '@/lib/models';

/** After a paid pack, locked trial videos serve the private original through the media proxy. */
export async function unlockLockedGenerationsForUser(userId: string) {
  await connectDB();
  await AiToolGeneration.updateMany({ userId, locked: true }, { $set: { locked: false } });
}
