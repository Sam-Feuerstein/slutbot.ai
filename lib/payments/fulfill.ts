import connectDB from '@/lib/db/mongodb';
import { SlutbotPayment, SlutbotUser, SlutbotWallet } from '@/lib/models';
import { getCheckoutPlan } from '@/lib/payments/catalog';
import { unlockLockedGenerationsForUser } from '@/lib/trial/unlock';

function isDupKey(err: unknown) {
  return Boolean(err && typeof err === 'object' && 'code' in err && (err as { code: number }).code === 11000);
}

function asUserId(value: unknown): string | null {
  if (!value) return null;
  const id = String(value);
  return /^[a-fA-F0-9]{24}$/.test(id) ? id : null;
}

/**
 * Pack Stars always stack on the leftover balance. Buying ULTRA (or any pack)
 * adds the full pack — it never replaces what the user already has.
 */
async function stackPackStarsOnAccount(input: {
  clientId: string;
  packStars: number;
  chargeId: string;
  userId?: string | null;
}) {
  const packStars = Math.max(0, Math.round(input.packStars));
  const userId = asUserId(input.userId);

  let user = userId
    ? await SlutbotUser.findByIdAndUpdate(userId, { $inc: { desires: packStars } }, { new: true })
    : null;

  if (!user) {
    user = await SlutbotUser.findOneAndUpdate(
      { clientId: input.clientId },
      { $inc: { desires: packStars } },
      { new: true },
    );
  }

  const walletClientId = typeof user?.clientId === 'string' && user.clientId ? user.clientId : input.clientId;

  await SlutbotWallet.findOneAndUpdate(
    { clientId: walletClientId },
    user
      ? { $set: { desires: user.desires, lastPaymentChargeId: input.chargeId, userId: user._id } }
      : {
          $inc: { desires: packStars },
          $set: { lastPaymentChargeId: input.chargeId, ...(userId ? { userId } : {}) },
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

  // Coupons change what the user pays. Wallet always gets the full pack Stars,
  // stacked on leftover Stars. Nothing from a smaller pack is wiped on ULTRA.
  const creditedStars = plan.desires;
  const owner = await SlutbotUser.findOne({ clientId: input.clientId }).select('_id');

  const fields = {
    clientId: input.clientId,
    userId: owner?._id ?? undefined,
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
    const linkedUser = await stackPackStarsOnAccount({
      clientId: input.clientId,
      packStars: creditedStars,
      chargeId: input.chargeId,
      userId: claimed.userId || owner?._id,
    });
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
