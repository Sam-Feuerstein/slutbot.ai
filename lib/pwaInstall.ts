import connectDB from '@/lib/db/mongodb';
import { PwaInstall, SlutbotPayment, SlutbotUser } from '@/lib/models';
import { isClientId } from '@/lib/payments/catalog';

export type PwaInstallRow = {
  id: string;
  clientId: string;
  createdAt: string;
  userId: string | null;
  email: string | null;
  name: string | null;
  status: 'guest' | 'free' | 'paid';
};

export async function recordPwaInstall(input: { clientId: string; userId?: string | null }) {
  const clientId = input.clientId.trim();
  if (!isClientId(clientId)) return { ok: false as const };

  await connectDB();
  const userId = input.userId || null;
  const existing = (await PwaInstall.findOne({ clientId }).lean()) as {
    _id: unknown;
    userId?: unknown;
  } | null;

  if (existing) {
    if (userId && !existing.userId) {
      await PwaInstall.updateOne({ _id: existing._id }, { $set: { userId } });
    }
    if (userId) {
      await SlutbotUser.updateOne(
        { _id: userId, $or: [{ pwaInstalledAt: null }, { pwaInstalledAt: { $exists: false } }] },
        { $set: { pwaInstalledAt: new Date() } },
      );
    }
    return { ok: true as const };
  }

  await PwaInstall.create({
    clientId,
    userId,
    createdAt: new Date(),
  });

  if (userId) {
    await SlutbotUser.updateOne(
      { _id: userId, $or: [{ pwaInstalledAt: null }, { pwaInstalledAt: { $exists: false } }] },
      { $set: { pwaInstalledAt: new Date() } },
    );
  }

  return { ok: true as const };
}

function accountStatus(user: { email?: string } | null, paid: boolean): PwaInstallRow['status'] {
  if (!user) return 'guest';
  return paid ? 'paid' : 'free';
}

export async function getPwaInstallSnapshot(limit = 100) {
  const take = Math.min(Math.max(Number(limit) || 100, 1), 500);
  await connectDB();

  const [rows, markedUsers, paidUserIds] = await Promise.all([
    PwaInstall.find({})
      .sort({ createdAt: -1 })
      .limit(take)
      .populate('userId', 'email name')
      .lean(),
    SlutbotUser.find({ pwaInstalledAt: { $type: 'date' } })
      .select('email name pwaInstalledAt')
      .sort({ pwaInstalledAt: -1 })
      .lean(),
    SlutbotPayment.distinct('userId', { status: 'paid', userId: { $ne: null } }),
  ]);

  const paidSet = new Set((paidUserIds as unknown[]).filter(Boolean).map((id) => String(id)));
  const linkedFromRows = new Set<string>();
  const installs: PwaInstallRow[] = [];

  for (const row of rows as Array<{
    _id: unknown;
    clientId?: string;
    createdAt?: Date;
    userId?: { _id?: unknown; email?: string; name?: string } | null;
  }>) {
    const populated = row.userId && typeof row.userId === 'object' ? row.userId : null;
    const uid = populated?._id ? String(populated._id) : row.userId ? String(row.userId) : null;
    if (uid) linkedFromRows.add(uid);
    const paid = uid ? paidSet.has(uid) : false;
    installs.push({
      id: String(row._id),
      clientId: row.clientId || '',
      createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : '',
      userId: uid,
      email: populated?.email || null,
      name: populated?.name || null,
      status: accountStatus(populated, paid),
    });
  }

  for (const user of markedUsers as Array<{
    _id: unknown;
    email?: string;
    name?: string;
    pwaInstalledAt?: Date;
  }>) {
    const uid = String(user._id);
    if (linkedFromRows.has(uid)) continue;
    const paid = paidSet.has(uid);
    installs.push({
      id: `user:${uid}`,
      clientId: '',
      createdAt: user.pwaInstalledAt ? new Date(user.pwaInstalledAt).toISOString() : '',
      userId: uid,
      email: user.email || null,
      name: user.name || null,
      status: accountStatus(user, paid),
    });
  }

  installs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const guests = await PwaInstall.countDocuments({
    $or: [{ userId: null }, { userId: { $exists: false } }],
  });
  const extraLinked = (markedUsers as Array<{ _id: unknown }>).filter(
    (user) => !linkedFromRows.has(String(user._id)),
  ).length;
  const linked = linkedFromRows.size + extraLinked;
  const visible = installs.slice(0, take);
  const paid = visible.filter((row) => row.status === 'paid').length;
  const free = visible.filter((row) => row.status === 'free').length;

  return {
    total: guests + linked,
    linked,
    guests,
    paid,
    free,
    installs: visible,
  };
}

export async function countPwaInstalls() {
  await connectDB();
  const [guests, linkedRows, markedUsers] = await Promise.all([
    PwaInstall.countDocuments({ $or: [{ userId: null }, { userId: { $exists: false } }] }),
    PwaInstall.distinct('userId', { userId: { $ne: null } }),
    SlutbotUser.find({ pwaInstalledAt: { $type: 'date' } }).select('_id').lean(),
  ]);
  const linkedIds = new Set((linkedRows as unknown[]).filter(Boolean).map((id) => String(id)));
  for (const user of markedUsers as Array<{ _id: unknown }>) linkedIds.add(String(user._id));
  return guests + linkedIds.size;
}
