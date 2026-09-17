/**
 * One-off credit usage analysis for pricing decisions.
 * Usage: node scripts/analyze-credit-usage.mjs
 */
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';

const root = path.resolve(import.meta.dirname, '..');
const envPath = path.join(root, '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'slutbot';
if (!uri) {
  console.error('MONGODB_URI missing');
  process.exit(1);
}

await mongoose.connect(uri, { dbName, family: 4 });

const db = mongoose.connection.db;

const users = await db.collection('slutbotusers').find({}).toArray();
const payments = await db
  .collection('slutbotpayments')
  .find({ status: 'paid', walletCredited: true })
  .toArray();
const jobs = await db
  .collection('generationjobs')
  .find({ status: { $in: ['charged', 'ingesting', 'completed', 'refunded'] } })
  .toArray();
const coupons = await db
  .collection('slutbotcouponredemptions')
  .find({ creditsGranted: { $gt: 0 } })
  .toArray();

const adminEmails = new Set(
  users.filter((u) => String(u.email || '').endsWith('@aislutbot.local')).map((u) => String(u._id)),
);

function purchasedForUser(user) {
  const uid = String(user._id);
  const cid = user.clientId || '';
  return payments
    .filter((p) => String(p.userId || '') === uid || (p.clientId === cid && p.clientId))
    .reduce((s, p) => s + (Number(p.desires) || 0), 0);
}

function spentForUser(userId) {
  return jobs
    .filter(
      (j) =>
        String(j.userId) === userId &&
        j.paidWith !== 'admin' &&
        j.status !== 'refunded' &&
        (Number(j.cost) || 0) > 0,
    )
    .reduce((s, j) => s + (Number(j.cost) || 0), 0);
}

function couponCreditsForUser(userId) {
  return coupons
    .filter((c) => String(c.userId) === userId)
    .reduce((s, c) => s + (Number(c.creditsGranted) || 0), 0);
}

const paidUserIds = new Set(
  payments.map((p) => String(p.userId || '')).filter(Boolean),
);

const rows = users
  .filter((u) => !adminEmails.has(String(u._id)))
  .map((u) => {
    const id = String(u._id);
    const purchased = purchasedForUser(u);
    const spent = spentForUser(id);
    const remaining = Math.max(0, Number(u.desires) || 0);
    const couponCredits = couponCreditsForUser(id);
    const granted = purchased + couponCredits;
    const utilization = granted > 0 ? spent / granted : spent > 0 ? 1 : 0;
    const hasPaid = paidUserIds.has(id) || purchased > 0;
    return {
      id,
      email: u.email || '',
      purchased,
      couponCredits,
      granted,
      spent,
      remaining,
      utilization,
      imageGens: Number(u.imageGens) || 0,
      videoGens: Number(u.videoGens) || 0,
      hasPaid,
    };
  });

const buyers = rows.filter((r) => r.hasPaid && r.purchased > 0);
const allSpenders = rows.filter((r) => r.spent > 0);

function pct(n) {
  return `${(n * 100).toFixed(1)}%`;
}

function bucket(util) {
  if (util === 0) return '0% (unused)';
  if (util < 0.25) return '1–24%';
  if (util < 0.5) return '25–49%';
  if (util < 0.75) return '50–74%';
  if (util < 1) return '75–99%';
  if (util === 1) return '100% (exact)';
  return '>100% (overspent/grants)';
}

const buckets = {};
for (const r of buyers) {
  const b = bucket(r.utilization);
  buckets[b] = (buckets[b] || 0) + 1;
}

const totalPurchased = buyers.reduce((s, r) => s + r.purchased, 0);
const totalSpent = buyers.reduce((s, r) => s + r.spent, 0);
const totalRemaining = buyers.reduce((s, r) => s + r.remaining, 0);

// Plan breakdown
const planStats = {};
for (const p of payments) {
  if (adminEmails.has(String(p.userId || ''))) continue;
  const plan = p.planId || 'unknown';
  if (!planStats[plan]) planStats[plan] = { count: 0, starsGranted: 0, usd: 0 };
  planStats[plan].count += 1;
  planStats[plan].starsGranted += Number(p.desires) || 0;
  planStats[plan].usd += Number(p.usdAmount) || 0;
}

// Generation cost breakdown
const genBreakdown = { image: { count: 0, stars: 0 }, video: { count: 0, stars: 0 } };
for (const j of jobs) {
  if (adminEmails.has(String(j.userId || ''))) continue;
  if (j.paidWith === 'admin' || j.status === 'refunded') continue;
  const cost = Number(j.cost) || 0;
  if (cost <= 0) continue;
  const mode = j.mode === 'video' ? 'video' : 'image';
  genBreakdown[mode].count += 1;
  genBreakdown[mode].stars += cost;
}

console.log(JSON.stringify({
  summary: {
    totalUsers: users.length,
    payingUsers: buyers.length,
    usersWhoSpent: allSpenders.length,
    totalStarsSold: totalPurchased,
    totalStarsSpentByBuyers: totalSpent,
    totalStarsRemainingWithBuyers: totalRemaining,
    platformUtilization: totalPurchased > 0 ? totalSpent / totalPurchased : 0,
    avgUtilizationPerBuyer: buyers.length
      ? buyers.reduce((s, r) => s + r.utilization, 0) / buyers.length
      : 0,
    buyersFullyConsumed: buyers.filter((r) => r.utilization >= 0.95 && r.remaining <= 50).length,
    buyersMostlyUnused: buyers.filter((r) => r.utilization < 0.25).length,
    buyersZeroSpend: buyers.filter((r) => r.spent === 0).length,
  },
  utilizationBuckets: buckets,
  planStats,
  genBreakdown,
  topBuyersBySpend: buyers
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 15)
    .map((r) => ({
      email: r.email.split('@')[0] + '@…',
      purchased: r.purchased,
      spent: r.spent,
      remaining: r.remaining,
      utilization: pct(r.utilization),
      gens: `${r.imageGens}img/${r.videoGens}vid`,
    })),
  idleBuyers: buyers
    .filter((r) => r.utilization < 0.1 && r.remaining > 100)
    .sort((a, b) => b.remaining - a.remaining)
    .slice(0, 10)
    .map((r) => ({
      email: r.email.split('@')[0] + '@…',
      purchased: r.purchased,
      spent: r.spent,
      remaining: r.remaining,
    })),
}, null, 2));

await mongoose.disconnect();
