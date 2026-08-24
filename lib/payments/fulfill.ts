import connectDB from '@/lib/db/mongodb';
import { SlutbotPayment, SlutbotUser, SlutbotWallet } from '@/lib/models';
import { getCheckoutPlan } from '@/lib/payments/catalog';

async function creditClientWallet(clientId: string, desires: number, chargeId: string, userId?: string | null) {
  const user = await SlutbotUser.findOne({ clientId });
  if (user) {
    user.desires = (user.desires ?? 0) + desires;
    await user.save();
  }

  await SlutbotWallet.findOneAndUpdate(
    { clientId },
    {
      $inc: { desires },
      $set: { lastPaymentChargeId: chargeId, ...(user ? { userId: user._id } : userId ? { userId } : {}) },
    },
    { upsert: true, new: true },
  );
}

export async function creditDesires(input: {
  clientId: string;
  planId: string;
  provider: 'nowpayments' | 'telegram_stars';
  chargeId: string;
  orderId?: string;
  usdAmount: number;
  starsAmount?: number;
}): Promise<{ ok: true; already?: boolean } | { ok: false; error: string }> {
  const plan = getCheckoutPlan(input.planId);
  if (!plan) return { ok: false, error: 'Unknown plan' };
  if (!input.chargeId) return { ok: false, error: 'Missing charge id' };

  await connectDB();

  const existing = await SlutbotPayment.findOne({
    chargeId: input.chargeId,
    status: 'paid',
  }).lean();
  if (existing) return { ok: true, already: true };

  await creditClientWallet(input.clientId, plan.desires, input.chargeId);

  await SlutbotPayment.findOneAndUpdate(
    { chargeId: input.chargeId },
    {
      $set: {
        clientId: input.clientId,
        planId: input.planId,
        provider: input.provider,
        status: 'paid',
        usdAmount: input.usdAmount,
        starsAmount: input.starsAmount ?? 0,
        desires: plan.desires,
        orderId: input.orderId ?? '',
        chargeId: input.chargeId,
      },
    },
    { upsert: true, new: true },
  );

  return { ok: true };
}

export { getWalletDesires } from '@/lib/users/wallet';
