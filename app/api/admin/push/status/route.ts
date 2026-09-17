import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { adminSessionOk } from '@/lib/auth/adminSession';
import { AdminPushSubscription } from '@/lib/models';
import { vapidPublicKey } from '@/lib/notifyAdmins';

export async function GET(req: NextRequest) {
  if (!(await adminSessionOk(req))) {
    return NextResponse.json({ message: 'Admin login required.' }, { status: 401 });
  }

  await connectDB();
  const subscriptionCount = await AdminPushSubscription.countDocuments();
  return NextResponse.json({
    vapidConfigured: Boolean(vapidPublicKey()),
    subscriptionCount,
  });
}
