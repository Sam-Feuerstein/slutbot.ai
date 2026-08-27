import connectDB from '@/lib/db/mongodb';
import { SlutbotCoupon, SlutbotCouponRedemption, SlutbotPayment, SlutbotUser } from '@/lib/models';
import { adjustUserDesires, getSpendableCredits } from '@/lib/users/wallet';
import { CRYPTO_DISCOUNT_PERCENT } from '@/lib/premiumPlans';
import { CRYPTO_COUPON_CODE, normalizeCryptoCouponCode } from '@/lib/payments/cryptoCoupon';
import {
  asPriceCouponType,
  normalizeCouponCode,
  type Coupon,
  type CouponInput,
  type CouponType,
  type PriceCoupon,
} from './types';

type CouponDoc = {
  _id: { toString(): string };
  code?: string;
  label?: string;
  type?: CouponType;
  creditsAmount?: number;
  discountPercent?: number;
  discountUsd?: number;
  enabled?: boolean;
  newUsersOnly?: boolean;
  oncePerUser?: boolean;
  maxRedemptions?: number | null;
  redemptionCount?: number;
  expiresAt?: Date | null;
  note?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

function normalizeStoredType(type?: string | null): CouponType {
  if (type === 'amount_off') return 'amount_off';
  if (type === 'credits') return 'credits';
  if (type === 'percent_off' || type === 'crypto_discount') return 'percent_off';
  return 'percent_off';
}

function toCoupon(doc: CouponDoc): Coupon {
  const type = normalizeStoredType(doc.type);
  return {
    id: String(doc._id),
    code: normalizeCouponCode(doc.code || ''),
    label: (doc.label || '').trim(),
    type,
    creditsAmount: Math.max(0, Math.round(Number(doc.creditsAmount) || 0)),
    discountPercent: Math.min(90, Math.max(0, Math.round(Number(doc.discountPercent) || 0))),
    discountUsd: Math.max(0, Math.round((Number(doc.discountUsd) || 0) * 100) / 100),
    enabled: doc.enabled !== false,
    newUsersOnly: Boolean(doc.newUsersOnly),
    oncePerUser: doc.oncePerUser !== false,
    maxRedemptions:
      doc.maxRedemptions == null || !Number.isFinite(Number(doc.maxRedemptions))
        ? null
        : Math.max(1, Math.round(Number(doc.maxRedemptions))),
    redemptionCount: Math.max(0, Math.round(Number(doc.redemptionCount) || 0)),
    expiresAt: doc.expiresAt ? new Date(doc.expiresAt).toISOString() : null,
    note: (doc.note || '').trim(),
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date().toISOString(),
  };
}

function toPriceCoupon(coupon: Coupon): PriceCoupon | null {
  if (coupon.type === 'credits') return null;
  if (coupon.type === 'amount_off') {
    if (coupon.discountUsd < 0.01) return null;
    return {
      code: coupon.code,
      type: 'amount_off',
      discountPercent: 0,
      discountUsd: coupon.discountUsd,
    };
  }
  if (coupon.discountPercent < 1) return null;
  return {
    code: coupon.code,
    type: 'percent_off',
    discountPercent: coupon.discountPercent,
    discountUsd: 0,
  };
}

function builtinPriceCoupon(code: string): PriceCoupon | null {
  const normalized = normalizeCryptoCouponCode(code);
  if (normalized === CRYPTO_COUPON_CODE) {
    return {
      code: CRYPTO_COUPON_CODE,
      type: 'percent_off',
      discountPercent: CRYPTO_DISCOUNT_PERCENT,
      discountUsd: 0,
    };
  }
  return null;
}

function sanitizeInput(input: CouponInput) {
  const code = normalizeCouponCode(input.code || '');
  if (!code || code.length < 3) {
    throw new Error('Coupon code must be at least 3 characters.');
  }
  if (code.length > 40) {
    throw new Error('Coupon code is too long.');
  }

  const rawType = input.type || 'percent_off';
  const type: CouponType =
    rawType === 'credits' ? 'credits' : rawType === 'amount_off' ? 'amount_off' : 'percent_off';
  const creditsAmount = Math.max(0, Math.round(Number(input.creditsAmount) || 0));
  const discountPercent = Math.min(90, Math.max(0, Math.round(Number(input.discountPercent) || 0)));
  const discountUsd = Math.max(0, Math.round((Number(input.discountUsd) || 0) * 100) / 100);

  if (type === 'credits' && creditsAmount < 1) {
    throw new Error('Credits coupons need at least 1 Slutcoin.');
  }
  if (type === 'percent_off' && discountPercent < 1) {
    throw new Error('Percent coupons need at least 1% off.');
  }
  if (type === 'amount_off' && discountUsd < 0.01) {
    throw new Error('Dollar coupons need at least $0.01 off.');
  }

  let expiresAt: string | null = null;
  if (input.expiresAt) {
    const date = new Date(input.expiresAt);
    if (Number.isNaN(date.getTime())) {
      throw new Error('Invalid expiry date.');
    }
    expiresAt = date.toISOString();
  }

  const maxRaw = input.maxRedemptions;
  const maxRedemptions =
    maxRaw == null || maxRaw === ('' as unknown as number) || !Number.isFinite(Number(maxRaw))
      ? null
      : Math.max(1, Math.round(Number(maxRaw)));

  return {
    code,
    label: (input.label || '').trim(),
    type,
    creditsAmount: type === 'credits' ? creditsAmount : 0,
    discountPercent: type === 'percent_off' ? discountPercent : 0,
    discountUsd: type === 'amount_off' ? discountUsd : 0,
    enabled: input.enabled !== false,
    newUsersOnly: Boolean(input.newUsersOnly),
    oncePerUser: input.oncePerUser !== false,
    maxRedemptions,
    expiresAt,
    note: (input.note || '').trim(),
  };
}

export async function listCoupons(): Promise<Coupon[]> {
  await connectDB();
  const rows = (await SlutbotCoupon.find({}).sort({ createdAt: -1 }).lean()) as CouponDoc[];
  return rows.map(toCoupon);
}

export async function getCouponByCode(code: string): Promise<Coupon | null> {
  await connectDB();
  const doc = (await SlutbotCoupon.findOne({ code: normalizeCouponCode(code) }).lean()) as CouponDoc | null;
  return doc ? toCoupon(doc) : null;
}

export async function upsertCoupon(input: CouponInput & { id?: string }): Promise<Coupon> {
  const next = sanitizeInput(input);
  await connectDB();

  if (input.id) {
    const existing = await SlutbotCoupon.findById(input.id).lean();
    if (!existing) throw new Error('Coupon not found.');

    const conflict = await SlutbotCoupon.findOne({
      code: next.code,
      _id: { $ne: input.id },
    }).lean();
    if (conflict) throw new Error('Another coupon already uses that code.');

    const saved = (await SlutbotCoupon.findByIdAndUpdate(
      input.id,
      {
        $set: {
          code: next.code,
          label: next.label,
          type: next.type,
          creditsAmount: next.creditsAmount,
          discountPercent: next.discountPercent,
          discountUsd: next.discountUsd,
          enabled: next.enabled,
          newUsersOnly: next.newUsersOnly,
          oncePerUser: next.oncePerUser,
          maxRedemptions: next.maxRedemptions,
          expiresAt: next.expiresAt ? new Date(next.expiresAt) : null,
          note: next.note,
        },
      },
      { new: true },
    ).lean()) as CouponDoc | null;
    if (!saved) throw new Error('Coupon not found.');
    return toCoupon(saved);
  }

  const duplicate = await SlutbotCoupon.findOne({ code: next.code }).lean();
  if (duplicate) throw new Error('A coupon with that code already exists.');

  const createdDoc = await SlutbotCoupon.create({
    code: next.code,
    label: next.label,
    type: next.type,
    creditsAmount: next.creditsAmount,
    discountPercent: next.discountPercent,
    discountUsd: next.discountUsd,
    enabled: next.enabled,
    newUsersOnly: next.newUsersOnly,
    oncePerUser: next.oncePerUser,
    maxRedemptions: next.maxRedemptions,
    redemptionCount: 0,
    expiresAt: next.expiresAt ? new Date(next.expiresAt) : null,
    note: next.note,
  });

  return toCoupon(createdDoc.toObject() as CouponDoc);
}

export async function setCouponEnabled(id: string, enabled: boolean): Promise<Coupon> {
  await connectDB();
  const saved = (await SlutbotCoupon.findByIdAndUpdate(
    id,
    { $set: { enabled: Boolean(enabled) } },
    { new: true },
  ).lean()) as CouponDoc | null;
  if (!saved) throw new Error('Coupon not found.');
  return toCoupon(saved);
}

export async function deleteCoupon(id: string): Promise<void> {
  await connectDB();
  const result = await SlutbotCoupon.findByIdAndDelete(id);
  if (!result) throw new Error('Coupon not found.');
}

async function userHasPaidPurchase(userId: string): Promise<boolean> {
  const paid = await SlutbotPayment.exists({ userId, status: 'paid' });
  return Boolean(paid);
}

export async function redeemCouponForUser(input: {
  code: string;
  userId: string;
}): Promise<{ coupon: Coupon; desires: number; creditsGranted: number }> {
  const code = normalizeCouponCode(input.code);
  if (!code) throw new Error('Enter a coupon code.');

  await connectDB();
  const user = (await SlutbotUser.findById(input.userId).select('clientId banned').lean()) as {
    _id: { toString(): string };
    clientId?: string;
    banned?: boolean;
  } | null;
  if (!user || user.banned) throw new Error('Account not found.');

  const couponDoc = (await SlutbotCoupon.findOne({ code }).lean()) as CouponDoc | null;
  if (!couponDoc) throw new Error('Invalid coupon code.');
  const coupon = toCoupon(couponDoc);

  if (!coupon.enabled) throw new Error('This coupon is no longer active.');
  if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() <= Date.now()) {
    throw new Error('This coupon has expired.');
  }
  if (coupon.maxRedemptions != null && coupon.redemptionCount >= coupon.maxRedemptions) {
    throw new Error('This coupon has reached its redemption limit.');
  }
  if (coupon.type !== 'credits') {
    throw new Error('This coupon is a checkout discount. Apply it on the checkout page.');
  }

  if (coupon.oncePerUser) {
    const already = await SlutbotCouponRedemption.exists({
      couponId: coupon.id,
      userId: input.userId,
    });
    if (already) throw new Error('You already redeemed this coupon.');
  }

  if (coupon.newUsersOnly) {
    const paid = await userHasPaidPurchase(input.userId);
    if (paid) throw new Error('This launch coupon is for new users who have not purchased yet.');
  }

  try {
    await SlutbotCouponRedemption.create({
      couponId: coupon.id,
      code: coupon.code,
      userId: input.userId,
      clientId: user.clientId || '',
      type: coupon.type,
      creditsGranted: coupon.creditsAmount,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (message.includes('E11000') || message.includes('duplicate')) {
      throw new Error('You already redeemed this coupon.');
    }
    throw err;
  }

  await SlutbotCoupon.findByIdAndUpdate(coupon.id, { $inc: { redemptionCount: 1 } });
  const credited = await adjustUserDesires(input.userId, coupon.creditsAmount);
  if (credited == null) throw new Error('Could not credit Slutcoins.');

  return { coupon, desires: await getSpendableCredits(input.userId), creditsGranted: coupon.creditsAmount };
}

async function assertPriceCouponUsable(coupon: Coupon, userId?: string | null) {
  if (!coupon.enabled) throw new Error('This coupon is no longer active.');
  if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() <= Date.now()) {
    throw new Error('This coupon has expired.');
  }
  if (coupon.maxRedemptions != null && coupon.redemptionCount >= coupon.maxRedemptions) {
    throw new Error('This coupon has reached its redemption limit.');
  }
  if (!userId) return;
  if (coupon.oncePerUser) {
    const already = await SlutbotCouponRedemption.exists({ couponId: coupon.id, userId });
    if (already) throw new Error('You already used this coupon.');
  }
  if (coupon.newUsersOnly) {
    const paid = await userHasPaidPurchase(userId);
    if (paid) throw new Error('This coupon is for new users who have not purchased yet.');
  }
}

export async function resolveCheckoutPriceCoupon(input: {
  code: string;
  userId?: string | null;
}): Promise<PriceCoupon> {
  const builtin = builtinPriceCoupon(input.code);
  if (builtin) return builtin;

  const coupon = await getCouponByCode(input.code);
  if (!coupon) throw new Error('Invalid coupon code.');
  if (coupon.type === 'credits') {
    throw new Error('This coupon adds Slutcoins on the Account page, not a checkout discount.');
  }
  await assertPriceCouponUsable(coupon, input.userId);
  const priced = toPriceCoupon(coupon);
  if (!priced) throw new Error('Invalid coupon code.');
  return priced;
}

export async function recordCheckoutCouponUse(input: {
  code: string;
  userId?: string | null;
  clientId: string;
}): Promise<void> {
  const builtin = builtinPriceCoupon(input.code);
  if (builtin) return;
  const coupon = await getCouponByCode(input.code);
  if (!coupon || coupon.type === 'credits' || !input.userId) return;

  try {
    await SlutbotCouponRedemption.create({
      couponId: coupon.id,
      code: coupon.code,
      userId: input.userId,
      clientId: input.clientId,
      type: asPriceCouponType(coupon.type),
      creditsGranted: 0,
    });
    await SlutbotCoupon.findByIdAndUpdate(coupon.id, { $inc: { redemptionCount: 1 } });
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (message.includes('E11000') || message.includes('duplicate')) return;
    throw err;
  }
}

export async function attachPendingCouponToPaidCharge(input: {
  clientId: string;
  planId: string;
  provider: 'nowpayments' | 'telegram_stars';
  chargeId: string;
  orderId?: string;
  starsAmount?: number;
}): Promise<void> {
  await connectDB();
  const filter: Record<string, unknown> = {
    clientId: input.clientId,
    planId: input.planId,
    provider: input.provider,
    status: 'pending',
  };
  if (input.orderId) filter.orderId = input.orderId;
  if (typeof input.starsAmount === 'number' && input.starsAmount > 0) {
    filter.starsAmount = input.starsAmount;
  }

  const pending = (await SlutbotPayment.findOne(filter).sort({ createdAt: -1 }).lean()) as {
    userId?: unknown;
    couponCode?: string;
    couponType?: string;
    couponDiscountPercent?: number;
    couponDiscountUsd?: number;
  } | null;
  if (!pending?.couponCode) return;

  await SlutbotPayment.updateOne(
    { chargeId: input.chargeId },
    {
      $set: {
        couponCode: pending.couponCode,
        couponType: pending.couponType || '',
        couponDiscountPercent: pending.couponDiscountPercent || 0,
        couponDiscountUsd: pending.couponDiscountUsd || 0,
      },
    },
  );

  await recordCheckoutCouponUse({
    code: pending.couponCode,
    userId: pending.userId ? String(pending.userId) : null,
    clientId: input.clientId,
  });
}

/** @deprecated Use resolveCheckoutPriceCoupon */
export async function resolveActiveCryptoDiscountCoupon(code: string): Promise<{
  code: string;
  discountPercent: number;
} | null> {
  try {
    const coupon = await resolveCheckoutPriceCoupon({ code });
    if (coupon.type !== 'percent_off') return null;
    return { code: coupon.code, discountPercent: coupon.discountPercent };
  } catch {
    return null;
  }
}
