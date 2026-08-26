import { NextRequest, NextResponse } from 'next/server';
import { adminSessionOk } from '@/lib/auth/adminSession';
import type { CouponInput, CouponType } from '@/lib/coupons';
import { deleteCoupon, listCoupons, setCouponEnabled, upsertCoupon } from '@/lib/coupons/store';

async function denyAdmin(req: NextRequest) {
  if (!(await adminSessionOk(req))) {
    return NextResponse.json({ message: 'Admin login required.' }, { status: 401 });
  }
  return null;
}

export async function GET(req: NextRequest) {
  const denied = await denyAdmin(req);
  if (denied) return denied;
  try {
    const coupons = await listCoupons();
    return NextResponse.json({ coupons });
  } catch (err) {
    console.error('Admin coupons list error:', err);
    return NextResponse.json({ message: 'Could not load coupons.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const denied = await denyAdmin(req);
  if (denied) return denied;
  const body = (await req.json().catch(() => null)) as (CouponInput & { id?: string }) | null;
  if (!body?.code?.trim()) {
    return NextResponse.json({ message: 'Coupon code is required.' }, { status: 400 });
  }
  try {
    const coupon = await upsertCoupon({
      id: body.id,
      code: body.code,
      label: body.label,
      type: body.type as CouponType | undefined,
      creditsAmount: body.creditsAmount,
      discountPercent: body.discountPercent,
      discountUsd: body.discountUsd,
      enabled: body.enabled,
      newUsersOnly: body.newUsersOnly,
      oncePerUser: body.oncePerUser,
      maxRedemptions: body.maxRedemptions,
      expiresAt: body.expiresAt,
      note: body.note,
    });
    return NextResponse.json({ coupon });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not save coupon.';
    return NextResponse.json({ message }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  const denied = await denyAdmin(req);
  if (denied) return denied;
  const body = (await req.json().catch(() => null)) as { id?: string; enabled?: boolean } | null;
  if (!body?.id || typeof body.enabled !== 'boolean') {
    return NextResponse.json({ message: 'id and enabled are required.' }, { status: 400 });
  }
  try {
    const coupon = await setCouponEnabled(body.id, body.enabled);
    return NextResponse.json({ coupon });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not update coupon.';
    return NextResponse.json({ message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const denied = await denyAdmin(req);
  if (denied) return denied;
  const id = req.nextUrl.searchParams.get('id')?.trim() || '';
  if (!id) {
    return NextResponse.json({ message: 'Coupon id is required.' }, { status: 400 });
  }
  try {
    await deleteCoupon(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not delete coupon.';
    return NextResponse.json({ message }, { status: 400 });
  }
}
