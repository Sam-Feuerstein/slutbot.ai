import connectDB from '@/lib/db/mongodb';
import { SlutbotUser, SlutbotWallet } from '@/lib/models';
import { ADMIN_INFINITE_DESIRES, isAdminAppUserEmail } from '@/lib/auth/adminUser';

export type CreditSource = 'paid' | 'trial' | 'admin';

type BalanceUser = {
  desires?: number;
  trialCredits?: number;
  email?: string;
};

export function spendableFromUser(user: BalanceUser): number {
  if (isAdminAppUserEmail(user.email)) return ADMIN_INFINITE_DESIRES;
  return Math.max(0, Math.round(user.desires ?? 0)) + Math.max(0, Math.round(user.trialCredits ?? 0));
}

export function publicBalanceFields(user: BalanceUser) {
  if (isAdminAppUserEmail(user.email)) {
    return {
      desires: ADMIN_INFINITE_DESIRES,
      paidDesires: ADMIN_INFINITE_DESIRES,
      trialCredits: 0,
      infinite: true as const,
    };
  }
  const paidDesires = Math.max(0, Math.round(user.desires ?? 0));
  const trialCredits = Math.max(0, Math.round(user.trialCredits ?? 0));
  return {
    desires: paidDesires + trialCredits,
    paidDesires,
    trialCredits,
  };
}

export async function getUserDesires(userId: string): Promise<number> {
  await connectDB();
  const user = (await SlutbotUser.findById(userId).select('desires').lean()) as { desires?: number } | null;
  return user?.desires ?? 0;
}

export async function getSpendableCredits(userId: string): Promise<number> {
  await connectDB();
  const user = (await SlutbotUser.findById(userId).select('desires trialCredits email').lean()) as BalanceUser | null;
  return user ? spendableFromUser(user) : 0;
}

export async function getWalletDesires(clientId: string): Promise<number> {
  await connectDB();
  const linked = (await SlutbotUser.findOne({ clientId }).select('desires trialCredits email').lean()) as BalanceUser | null;
  if (linked) return spendableFromUser(linked);
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
  if (cost <= 0) return { ok: false, desires: await getSpendableCredits(userId) };

  const user = await SlutbotUser.findOneAndUpdate(
    { _id: userId, banned: { $ne: true }, desires: { $gte: cost } },
    { $inc: { desires: -cost } },
    { new: true },
  );
  if (!user) {
    return { ok: false, desires: await getSpendableCredits(userId) };
  }

  await syncWalletBalance(user.clientId, user._id, user.desires);
  return { ok: true, desires: spendableFromUser(user) };
}

export async function spendGenerationCredits(
  userId: string,
  amount: number,
  paidWith: CreditSource,
): Promise<{ ok: boolean; charged: boolean; desires: number }> {
  await connectDB();
  const cost = Math.round(amount);
  if (paidWith === 'admin' || cost <= 0) {
    return { ok: true, charged: false, desires: await getSpendableCredits(userId) };
  }

  if (paidWith === 'trial') {
    const user = await SlutbotUser.findOneAndUpdate(
      { _id: userId, banned: { $ne: true }, trialCredits: { $gte: cost } },
      { $inc: { trialCredits: -cost } },
      { new: true },
    );
    if (!user) return { ok: false, charged: false, desires: await getSpendableCredits(userId) };
    return { ok: true, charged: true, desires: spendableFromUser(user) };
  }

  const spent = await spendUserDesires(userId, cost);
  return { ok: spent.ok, charged: spent.ok, desires: spent.desires };
}

export async function reverseGenerationSpend(userId: string, amount: number, paidWith: CreditSource) {
  const cost = Math.round(amount);
  if (paidWith === 'admin' || cost <= 0) return getSpendableCredits(userId);
  if (paidWith === 'trial') {
    await connectDB();
    const user = await SlutbotUser.findByIdAndUpdate(userId, { $inc: { trialCredits: cost } }, { new: true });
    return user ? spendableFromUser(user) : getSpendableCredits(userId);
  }
  await adjustUserDesires(userId, cost);
  return getSpendableCredits(userId);
}

export async function recordUserGeneration(userId: string, mode: 'image' | 'video') {
  await connectDB();
  const field = mode === 'image' ? 'imageGens' : 'videoGens';
  await SlutbotUser.findByIdAndUpdate(userId, { $inc: { [field]: 1 } });
}
