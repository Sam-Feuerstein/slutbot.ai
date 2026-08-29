import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { SlutbotPayment, SlutbotUser } from '@/lib/models';
import { adminSessionOk } from '@/lib/auth/adminSession';
import { getTotalVisits, getVisitDashboardStats } from '@/lib/analytics';
import { countPwaInstalls } from '@/lib/pwaInstall';

function utcDay(date: Date) {
  return date.toISOString().slice(0, 10);
}

function lastDays(n: number) {
  const days: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

export async function GET(req: NextRequest) {
  if (!(await adminSessionOk(req))) {
    return NextResponse.json({ message: 'Admin login required.' }, { status: 401 });
  }

  await connectDB();
  const [users, paidPayments, pwaInstalls, totalVisits, visitStats] = await Promise.all([
    SlutbotUser.find({}).select('_id clientId createdAt').lean(),
    SlutbotPayment.find({ status: 'paid' }).select('userId clientId usdAmount').lean(),
    countPwaInstalls().catch(() => 0),
    getTotalVisits().catch(() => 0),
    getVisitDashboardStats(14).catch(() => ({
      totalUniqueVisitors: 0,
      dailyVisits: [],
      visitsByCountry: [],
    })),
  ]);

  const paidUserIds = new Set(
    (paidPayments as Array<{ userId?: unknown }>)
      .filter((row) => row.userId)
      .map((row) => String(row.userId)),
  );
  const paidClientIds = new Set(
    (paidPayments as Array<{ clientId?: string }>).map((row) => row.clientId || '').filter(Boolean),
  );

  const isPaidUser = (user: { _id: unknown; clientId?: string }) =>
    paidUserIds.has(String(user._id)) || paidClientIds.has(user.clientId || '');

  const totalUsers = users.length;
  const paidUsers = users.filter(isPaidUser).length;
  const freeUsers = Math.max(0, totalUsers - paidUsers);
  const totalPaid = (paidPayments as Array<{ usdAmount?: number }>).reduce(
    (sum, row) => sum + (Number(row.usdAmount) || 0),
    0,
  );

  const days = lastDays(14);
  const dailyMap = Object.fromEntries(days.map((day) => [day, { day, paid: 0, free: 0 }]));
  for (const user of users as Array<{ _id: unknown; clientId?: string; createdAt?: Date }>) {
    if (!user.createdAt) continue;
    const day = utcDay(new Date(user.createdAt));
    if (!dailyMap[day]) continue;
    if (isPaidUser(user)) dailyMap[day].paid += 1;
    else dailyMap[day].free += 1;
  }

  return NextResponse.json({
    totalPaid: Math.round(totalPaid * 100) / 100,
    totalUsers,
    paidUsers,
    freeUsers,
    pwaInstalls,
    totalVisits,
    dailyVisits: visitStats.dailyVisits,
    visitsByCountry: visitStats.visitsByCountry,
    daily: days.map((day) => dailyMap[day]),
  });
}
