import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { adminSessionOk } from '@/lib/auth/adminSession';
import { AdminPushSubscription } from '@/lib/models';

export async function POST(req: NextRequest) {
  if (!(await adminSessionOk(req))) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { subscription } = (await req.json()) as {
    subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  };
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return NextResponse.json({ message: 'Invalid subscription' }, { status: 400 });
  }

  await connectDB();
  await AdminPushSubscription.findOneAndUpdate(
    { endpoint: subscription.endpoint },
    {
      endpoint: subscription.endpoint,
      keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
    },
    { upsert: true, new: true },
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  if (!(await adminSessionOk(req))) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { endpoint } = (await req.json()) as { endpoint?: string };
  if (endpoint) {
    await connectDB();
    await AdminPushSubscription.deleteOne({ endpoint });
  }

  return NextResponse.json({ ok: true });
}
