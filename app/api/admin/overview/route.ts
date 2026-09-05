import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { AiToolGeneration, GenerationJob, SlutbotPayment, SlutbotUser } from '@/lib/models';
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

  const genStart = new Date(`${days[0]}T00:00:00.000Z`);
  const dailyGens = Object.fromEntries(days.map((day) => [day, { day, images: 0, videos: 0 }]));

  function applyGenCounts(
    rows: Array<{ _id?: { day?: string; mode?: string }; n?: number }>,
    merge: 'sum' | 'max',
  ) {
    for (const row of rows) {
      const day = row._id?.day || '';
      const bucket = dailyGens[day];
      if (!bucket) continue;
      const n = Number(row.n) || 0;
      if (row._id?.mode === 'video') {
        bucket.videos = merge === 'max' ? Math.max(bucket.videos, n) : bucket.videos + n;
      } else if (row._id?.mode === 'image') {
        bucket.images = merge === 'max' ? Math.max(bucket.images, n) : bucket.images + n;
      }
    }
  }

  const genGroup = [
    {
      $group: {
        _id: {
          day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          mode: '$mode',
        },
        n: { $sum: 1 },
      },
    },
  ];

  const [outputGens, jobGens] = await Promise.all([
    AiToolGeneration.aggregate([{ $match: { createdAt: { $gte: genStart } } }, ...genGroup]),
    GenerationJob.aggregate([
      {
        $match: {
          createdAt: { $gte: genStart },
          status: { $in: ['completed', 'charged', 'ingesting'] },
          paidWith: { $ne: 'admin' },
        },
      },
      ...genGroup,
    ]),
  ]);
  applyGenCounts(outputGens as Array<{ _id?: { day?: string; mode?: string }; n?: number }>, 'max');
  applyGenCounts(jobGens as Array<{ _id?: { day?: string; mode?: string }; n?: number }>, 'max');

  const dailyGenerations = days.map((day) => dailyGens[day]);
  const totalImages = dailyGenerations.reduce((sum, row) => sum + row.images, 0);
  const totalVideos = dailyGenerations.reduce((sum, row) => sum + row.videos, 0);

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
    dailyGenerations,
    totalImages,
    totalVideos,
  });
}
