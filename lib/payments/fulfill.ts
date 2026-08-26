import connectDB from '@/lib/db/mongodb';
import { SlutbotPayment, SlutbotUser, SlutbotWallet } from '@/lib/models';
import { getCheckoutPlan } from '@/lib/payments/catalog';

function isDupKey(err: unknown) {
  return Boolean(err && typeof err === 'object' && 'code' in err && (err as { code: number }).code === 11000);
}

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

  return user;
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

  const fields = {
    clientId: input.clientId,
    planId: input.planId,
    provider: input.provider,
    status: 'paid' as const,
    usdAmount: input.usdAmount,
    starsAmount: input.starsAmount ?? 0,
    desires: plan.desires,
    orderId: input.orderId ?? '',
    chargeId: input.chargeId,
    walletCredited: false,
  };

  try {
    await SlutbotPayment.create(fields);
  } catch (err) {
    if (!isDupKey(err)) throw err;
  }

  const claimed = await SlutbotPayment.findOneAndUpdate(
    { chargeId: input.chargeId, walletCredited: { $ne: true } },
    { $set: { walletCredited: true, status: 'paid' } },
  );
  if (!claimed) return { ok: true, already: true };

  try {
    const linkedUser = await creditClientWallet(input.clientId, plan.desires, input.chargeId);
    if (linkedUser) {
      await SlutbotPayment.updateOne({ chargeId: input.chargeId }, { $set: { userId: linkedUser._id } });
    }
  } catch (err) {
    await SlutbotPayment.updateOne({ chargeId: input.chargeId }, { $set: { walletCredited: false } });
    throw err;
  }

  try {
    const { attachPendingCouponToPaidCharge } = await import('@/lib/coupons/store');
    await attachPendingCouponToPaidCharge({
      clientId: input.clientId,
      planId: input.planId,
      provider: input.provider,
      chargeId: input.chargeId,
      orderId: input.orderId,
      starsAmount: input.starsAmount,
    });
  } catch (err) {
    console.error('Could not record checkout coupon:', err);
  }

  return { ok: true };
}

export { getWalletDesires } from '@/lib/users/wallet';
