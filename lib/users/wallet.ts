import connectDB from '@/lib/db/mongodb';
import { SlutbotUser, SlutbotWallet } from '@/lib/models';

export async function getUserDesires(userId: string): Promise<number> {
  await connectDB();
  const user = (await SlutbotUser.findById(userId).select('desires').lean()) as { desires?: number } | null;
  return user?.desires ?? 0;
}

export async function getWalletDesires(clientId: string): Promise<number> {
  await connectDB();
  const linked = (await SlutbotUser.findOne({ clientId }).select('desires').lean()) as { desires?: number } | null;
  if (linked) return linked.desires ?? 0;
  const wallet = (await SlutbotWallet.findOne({ clientId }).select('desires').lean()) as { desires?: number } | null;
  return wallet?.desires ?? 0;
}

export async function setUserDesires(userId: string, desires: number) {
  await connectDB();
  const amount = Math.max(0, Math.round(desires));
  const user = await SlutbotUser.findByIdAndUpdate(userId, { $set: { desires: amount } }, { new: true });
  if (user?.clientId) {
    await SlutbotWallet.findOneAndUpdate(
      { clientId: user.clientId },
      { $set: { desires: amount, userId: user._id } },
      { upsert: true },
    );
  }
  return amount;
}

export async function adjustUserDesires(userId: string, delta: number) {
  await connectDB();
  const user = await SlutbotUser.findByIdAndUpdate(
    userId,
    { $inc: { desires: Math.round(delta) } },
    { new: true },
  );
  if (!user) return null;
  if (user.desires < 0) {
    user.desires = 0;
    await user.save();
  }
  if (user.clientId) {
    await SlutbotWallet.findOneAndUpdate(
      { clientId: user.clientId },
      { $set: { desires: user.desires, userId: user._id } },
      { upsert: true },
    );
  }
  return user.desires;
}

async function syncWalletBalance(clientId: string | undefined, userId: unknown, desires: number) {
  if (!clientId) return;
  await SlutbotWallet.findOneAndUpdate(
    { clientId },
    { $set: { desires, userId } },
    { upsert: true },
  );
}

export async function spendUserDesires(userId: string, amount: number): Promise<{ ok: boolean; desires: number }> {
  await connectDB();
  const cost = Math.round(amount);
  if (cost <= 0) return { ok: false, desires: await getUserDesires(userId) };

  const user = await SlutbotUser.findOneAndUpdate(
    { _id: userId, banned: { $ne: true }, desires: { $gte: cost } },
    { $inc: { desires: -cost } },
    { new: true },
  );
  if (!user) {
    const current = (await SlutbotUser.findById(userId).select('desires').lean()) as { desires?: number } | null;
    return { ok: false, desires: current?.desires ?? 0 };
  }

  await syncWalletBalance(user.clientId, user._id, user.desires);
  return { ok: true, desires: user.desires };
}

export async function recordUserGeneration(userId: string, mode: 'image' | 'video') {
  await connectDB();
  const field = mode === 'image' ? 'imageGens' : 'videoGens';
  await SlutbotUser.findByIdAndUpdate(userId, { $inc: { [field]: 1 } });
}
