import connectDB from '@/lib/db/mongodb';
import { SlutbotPayment, SlutbotUser, SlutbotWallet } from '@/lib/models';
import { getCheckoutPlan } from '@/lib/payments/catalog';
import { unlockLockedGenerationsForUser } from '@/lib/trial/unlock';

function isDupKey(err: unknown) {
  return Boolean(err && typeof err === 'object' && 'code' in err && (err as { code: number }).code === 11000);
}

async function creditClientWallet(clientId: string, desires: number, chargeId: string, userId?: string | null) {
  const user = await SlutbotUser.findOneAndUpdate(
    { clientId },
    { $inc: { desires } },
    { new: true },
  );

  await SlutbotWallet.findOneAndUpdate(
    { clientId },
    user
      ? { $set: { desires: user.desires, lastPaymentChargeId: chargeId, userId: user._id } }
      : {
          $inc: { desires },
          $set: { lastPaymentChargeId: chargeId, ...(userId ? { userId } : {}) },
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
}): Promise<{ ok: true; already?: boolean; desires?: number } | { ok: false; error: string }> {
  const plan = getCheckoutPlan(input.planId);
  if (!plan) return { ok: false, error: 'Unknown plan' };
  if (!input.chargeId) return { ok: false, error: 'Missing charge id' };

  await connectDB();

  // Coupons change what the user pays. Wallet always gets the full pack Stars.
  const creditedStars = plan.desires;

  const fields = {
    clientId: input.clientId,
    planId: input.planId,
    provider: input.provider,
    status: 'paid' as const,
    usdAmount: input.usdAmount,
    starsAmount: input.starsAmount ?? 0,
    desires: creditedStars,
    orderId: input.orderId ?? '',
    chargeId: input.chargeId,
    walletCredited: false,
  };

  const pendingFilter: Record<string, unknown> = {
    clientId: input.clientId,
    planId: input.planId,
    provider: input.provider,
    status: 'pending',
    walletCredited: { $ne: true },
  };
  if (input.orderId) pendingFilter.orderId = input.orderId;

  try {
    const pending = await SlutbotPayment.findOneAndUpdate(
      pendingFilter,
      {
        $set: {
          status: 'paid',
          chargeId: input.chargeId,
          usdAmount: input.usdAmount,
          starsAmount: input.starsAmount ?? 0,
          desires: creditedStars,
        },
      },
      { sort: { createdAt: -1 } },
    );
    if (!pending) {
      await SlutbotPayment.create(fields);
    }
  } catch (err) {
    if (!isDupKey(err)) throw err;
  }

  const claimed = await SlutbotPayment.findOneAndUpdate(
    { chargeId: input.chargeId, walletCredited: { $ne: true } },
    { $set: { walletCredited: true, status: 'paid' } },
  );
  if (!claimed) return { ok: true, already: true };

  try {
    const linkedUser = await creditClientWallet(input.clientId, creditedStars, input.chargeId);
    if (linkedUser) {
      await SlutbotPayment.updateOne({ chargeId: input.chargeId }, { $set: { userId: linkedUser._id } });
      try {
        await unlockLockedGenerationsForUser(String(linkedUser._id));
      } catch (err) {
        console.error('Could not unlock trial videos after payment:', err);
      }
    }

    try {
      const { notifyAdminsOfSale } = await import('@/lib/notifyAdmins');
      const user = linkedUser;
      const username =
        user?.name?.trim() ||
        (typeof user?.email === 'string' ? user.email.split('@')[0] : '') ||
        undefined;
      await notifyAdminsOfSale({
        planId: input.planId,
        method: input.provider === 'telegram_stars' ? 'stars' : 'crypto',
        username,
        usd: input.usdAmount,
      });
    } catch (err) {
      console.error('Could not notify admins of sale:', err);
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

  return { ok: true, desires: creditedStars };
}

export { getWalletDesires } from '@/lib/users/wallet';
