import connectDB from '@/lib/db/mongodb';
import { GenerationJob, SlutbotCouponRedemption, SlutbotPayment, SlutbotUser } from '@/lib/models';
import { DESIRE_COSTS } from '@/lib/generation/costs';

const ADMIN_EMAIL_SUFFIX = '@aislutbot.local';

type UserLean = {
  _id: unknown;
  email?: string;
  clientId?: string;
  desires?: number;
  imageGens?: number;
  videoGens?: number;
};

type PaymentLean = {
  userId?: unknown;
  clientId?: string;
  planId?: string;
  desires?: number;
  usdAmount?: number;
};

type JobLean = {
  userId?: unknown;
  mode?: string;
  cost?: number;
  paidWith?: string;
  status?: string;
};

function isAdminUser(user: UserLean): boolean {
  return String(user.email || '').toLowerCase().endsWith(ADMIN_EMAIL_SUFFIX);
}

function utilizationBucket(rate: number): string {
  if (rate === 0) return '0% unused';
  if (rate < 0.25) return '1–24%';
  if (rate < 0.5) return '25–49%';
  if (rate < 0.75) return '50–74%';
  if (rate < 0.95) return '75–94%';
  if (rate <= 1.05) return '95–100%';
  return '>100%';
}

export type CreditUsageReport = {
  summary: {
    totalUsers: number;
    payingUsers: number;
    repeatBuyers: number;
    totalPurchases: number;
    totalStarsSold: number;
    totalRevenueUsd: number;
    totalStarsSpentByBuyers: number;
    totalStarsRemainingWithBuyers: number;
    platformUtilization: number;
    avgUtilizationPerBuyer: number;
    buyersFullyConsumed: number;
    buyersMostlyUnused: number;
    buyersZeroSpend: number;
    nonBuyersWhoSpent: number;
    nonBuyerStarsSpent: number;
  };
  utilizationBuckets: Array<{ bucket: string; count: number }>;
  planStats: Array<{
    planId: string;
    purchases: number;
    starsGranted: number;
    revenueUsd: number;
    uniqueBuyers: number;
  }>;
  genBreakdown: {
    image: { count: number; stars: number; avgCost: number };
    video: { count: number; stars: number; avgCost: number };
  };
  packTheoretical: {
    sparkImages: number;
    sparkVideos480: number;
    imageCost: number;
    videoCost480: number;
  };
  buyers: Array<{
    id: string;
    email: string;
    name: string;
    purchases: number;
    purchased: number;
    couponCredits: number;
    granted: number;
    spent: number;
    remaining: number;
    utilization: number;
    utilizationLabel: string;
    imageGens: number;
    videoGens: number;
    lastPaidAt: string | null;
  }>;
};

export async function getCreditUsageReport(): Promise<CreditUsageReport> {
  await connectDB();

  const [users, payments, jobs, couponRows] = await Promise.all([
    SlutbotUser.find({}).select('email clientId desires imageGens videoGens name').lean() as Promise<UserLean[]>,
    SlutbotPayment.find({ status: 'paid', walletCredited: true })
      .select('userId clientId planId desires usdAmount createdAt')
      .lean() as Promise<Array<PaymentLean & { createdAt?: Date }>>,
    GenerationJob.find({
      status: { $in: ['charged', 'ingesting', 'completed', 'refunded'] },
      cost: { $gt: 0 },
    })
      .select('userId mode cost paidWith status')
      .lean() as Promise<JobLean[]>,
    SlutbotCouponRedemption.find({ creditsGranted: { $gt: 0 } })
      .select('userId creditsGranted')
      .lean() as Promise<Array<{ userId?: unknown; creditsGranted?: number }>>,
  ]);

  const regularUsers = users.filter((u) => !isAdminUser(u));
  const adminIds = new Set(users.filter(isAdminUser).map((u) => String(u._id)));

  const paymentsByUser = new Map<string, Array<PaymentLean & { createdAt?: Date }>>();
  for (const payment of payments) {
    if (payment.userId && adminIds.has(String(payment.userId))) continue;
    const keys = new Set<string>();
    if (payment.userId) keys.add(String(payment.userId));
    const linked = regularUsers.find((u) => u.clientId && u.clientId === payment.clientId);
    if (linked) keys.add(String(linked._id));
    for (const key of keys) {
      const list = paymentsByUser.get(key) || [];
      list.push(payment);
      paymentsByUser.set(key, list);
    }
  }

  const spentByUser = new Map<string, number>();
  const genByUser = new Map<string, { image: number; video: number }>();
  for (const job of jobs) {
    if (!job.userId || adminIds.has(String(job.userId))) continue;
    if (job.paidWith === 'admin' || job.status === 'refunded') continue;
    const cost = Number(job.cost) || 0;
    if (cost <= 0) continue;
    const uid = String(job.userId);
    spentByUser.set(uid, (spentByUser.get(uid) || 0) + cost);
    const gen = genByUser.get(uid) || { image: 0, video: 0 };
    if (job.mode === 'video') gen.video += 1;
    else gen.image += 1;
    genByUser.set(uid, gen);
  }

  const couponByUser = new Map<string, number>();
  for (const row of couponRows) {
    if (!row.userId || adminIds.has(String(row.userId))) continue;
    const uid = String(row.userId);
    couponByUser.set(uid, (couponByUser.get(uid) || 0) + (Number(row.creditsGranted) || 0));
  }

  const paidUserIds = new Set<string>();
  for (const [uid, list] of paymentsByUser) {
    if (list.reduce((s, p) => s + (Number(p.desires) || 0), 0) > 0) paidUserIds.add(uid);
  }

  const buyers = regularUsers
    .filter((u) => paidUserIds.has(String(u._id)))
    .map((u) => {
      const id = String(u._id);
      const userPayments = paymentsByUser.get(id) || [];
      const purchased = userPayments.reduce((s, p) => s + (Number(p.desires) || 0), 0);
      const couponCredits = couponByUser.get(id) || 0;
      const granted = purchased + couponCredits;
      const spent = spentByUser.get(id) || 0;
      const remaining = Math.max(0, Number(u.desires) || 0);
      const utilization = granted > 0 ? spent / granted : 0;
      const lastPaid = userPayments
        .map((p) => p.createdAt)
        .filter(Boolean)
        .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime())[0];

      return {
        id,
        email: u.email || '',
        name: (u as { name?: string }).name || '',
        purchases: userPayments.length,
        purchased,
        couponCredits,
        granted,
        spent,
        remaining,
        utilization,
        utilizationLabel: utilizationBucket(utilization),
        imageGens: Number(u.imageGens) || 0,
        videoGens: Number(u.videoGens) || 0,
        lastPaidAt: lastPaid ? new Date(lastPaid).toISOString() : null,
      };
    })
    .sort((a, b) => b.spent - a.spent);

  const bucketMap: Record<string, number> = {};
  for (const buyer of buyers) {
    bucketMap[buyer.utilizationLabel] = (bucketMap[buyer.utilizationLabel] || 0) + 1;
  }

  const planMap: Record<string, { purchases: number; starsGranted: number; revenueUsd: number; buyers: Set<string> }> =
    {};
  for (const payment of payments) {
    if (payment.userId && adminIds.has(String(payment.userId))) continue;
    const planId = payment.planId || 'unknown';
    if (!planMap[planId]) {
      planMap[planId] = { purchases: 0, starsGranted: 0, revenueUsd: 0, buyers: new Set() };
    }
    planMap[planId].purchases += 1;
    planMap[planId].starsGranted += Number(payment.desires) || 0;
    planMap[planId].revenueUsd += Number(payment.usdAmount) || 0;
    if (payment.userId) planMap[planId].buyers.add(String(payment.userId));
  }

  const genBreakdown = { image: { count: 0, stars: 0, avgCost: 0 }, video: { count: 0, stars: 0, avgCost: 0 } };
  for (const job of jobs) {
    if (!job.userId || adminIds.has(String(job.userId))) continue;
    if (job.paidWith === 'admin' || job.status === 'refunded') continue;
    const cost = Number(job.cost) || 0;
    if (cost <= 0) continue;
    const mode = job.mode === 'video' ? 'video' : 'image';
    genBreakdown[mode].count += 1;
    genBreakdown[mode].stars += cost;
  }
  genBreakdown.image.avgCost = genBreakdown.image.count ? genBreakdown.image.stars / genBreakdown.image.count : 0;
  genBreakdown.video.avgCost = genBreakdown.video.count ? genBreakdown.video.stars / genBreakdown.video.count : 0;

  const totalStarsSold = buyers.reduce((s, b) => s + b.purchased, 0);
  const totalStarsSpentByBuyers = buyers.reduce((s, b) => s + b.spent, 0);
  const totalStarsRemainingWithBuyers = buyers.reduce((s, b) => s + b.remaining, 0);
  const totalRevenueUsd = payments
    .filter((p) => !p.userId || !adminIds.has(String(p.userId)))
    .reduce((s, p) => s + (Number(p.usdAmount) || 0), 0);

  const nonBuyersWhoSpent = [...spentByUser.entries()].filter(([uid, spent]) => !paidUserIds.has(uid) && spent > 0);
  const nonBuyerStarsSpent = nonBuyersWhoSpent.reduce((s, [, spent]) => s + spent, 0);

  return {
    summary: {
      totalUsers: regularUsers.length,
      payingUsers: buyers.length,
      repeatBuyers: buyers.filter((b) => b.purchases > 1).length,
      totalPurchases: payments.filter((p) => !p.userId || !adminIds.has(String(p.userId))).length,
      totalStarsSold,
      totalRevenueUsd: Math.round(totalRevenueUsd * 100) / 100,
      totalStarsSpentByBuyers,
      totalStarsRemainingWithBuyers,
      platformUtilization: totalStarsSold > 0 ? totalStarsSpentByBuyers / totalStarsSold : 0,
      avgUtilizationPerBuyer: buyers.length
        ? buyers.reduce((s, b) => s + b.utilization, 0) / buyers.length
        : 0,
      buyersFullyConsumed: buyers.filter((b) => b.utilization >= 0.95 && b.remaining <= 50).length,
      buyersMostlyUnused: buyers.filter((b) => b.utilization < 0.25).length,
      buyersZeroSpend: buyers.filter((b) => b.spent === 0).length,
      nonBuyersWhoSpent: nonBuyersWhoSpent.length,
      nonBuyerStarsSpent,
    },
    utilizationBuckets: Object.entries(bucketMap)
      .map(([bucket, count]) => ({ bucket, count }))
      .sort((a, b) => b.count - a.count),
    planStats: Object.entries(planMap)
      .map(([planId, row]) => ({
        planId,
        purchases: row.purchases,
        starsGranted: row.starsGranted,
        revenueUsd: Math.round(row.revenueUsd * 100) / 100,
        uniqueBuyers: row.buyers.size,
      }))
      .sort((a, b) => b.starsGranted - a.starsGranted),
    genBreakdown,
    packTheoretical: {
      sparkImages: Math.floor(750 / DESIRE_COSTS.image),
      sparkVideos480: Math.floor(750 / DESIRE_COSTS.videoBetter),
      imageCost: DESIRE_COSTS.image,
      videoCost480: DESIRE_COSTS.videoBetter,
    },
    buyers,
  };
}
