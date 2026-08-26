import { NextRequest, NextResponse } from 'next/server';
import { adminSessionOk } from '@/lib/auth/adminSession';
import {
  COUNTRY_NAMES,
  deleteStarsGeoRule,
  getStarsGeoConfig,
  listStarsGeoRules,
  seedAsianStarMarkets,
  seedHighCostStarMarkets,
  setStarsGeoConfig,
  starsGeoCatalogPacks,
  upsertStarsGeoRule,
  type StarsGeoMode,
} from '@/lib/starsGeo';
import { applyStarsGeoPrice } from '@/lib/starsGeo/pricing';

async function denyAdmin(req: NextRequest) {
  if (!(await adminSessionOk(req))) {
    return NextResponse.json({ message: 'Admin login required.' }, { status: 401 });
  }
  return null;
}

export async function GET(req: NextRequest) {
  const denied = await denyAdmin(req);
  if (denied) return denied;
  const [config, rules] = await Promise.all([getStarsGeoConfig(), listStarsGeoRules()]);
  return NextResponse.json({
    ...config,
    rules,
    countries: Object.entries(COUNTRY_NAMES)
      .map(([code, name]) => ({ code, name }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    packs: starsGeoCatalogPacks().map((plan) => ({ id: plan.id, tier: plan.label, baseStars: plan.stars })),
    preview: rules.map((rule) => ({
      country: rule.country,
      packs: starsGeoCatalogPacks().map((plan) => ({
        id: plan.id,
        stars: applyStarsGeoPrice(plan.stars, plan.id, rule.enabled ? rule : null, config.roundUpTo),
      })),
    })),
  });
}

export async function PUT(req: NextRequest) {
  const denied = await denyAdmin(req);
  if (denied) return denied;
  const body = (await req.json().catch(() => null)) as {
    enabled?: boolean;
    roundUpTo?: number;
    seed?: boolean;
    seedAsia?: boolean;
  } | null;
  if (body?.seed || body?.seedAsia) {
    const created = body.seedAsia
      ? await seedAsianStarMarkets(20)
      : await seedHighCostStarMarkets(20);
    const [config, rules] = await Promise.all([getStarsGeoConfig(), listStarsGeoRules()]);
    return NextResponse.json({ ...config, rules, seeded: created.length });
  }
  const config = await setStarsGeoConfig({
    enabled: body?.enabled,
    roundUpTo: body?.roundUpTo,
  });
  return NextResponse.json(config);
}

export async function POST(req: NextRequest) {
  const denied = await denyAdmin(req);
  if (denied) return denied;
  const body = (await req.json().catch(() => null)) as {
    country?: string;
    name?: string;
    enabled?: boolean;
    mode?: StarsGeoMode;
    discountPercent?: number;
    customStars?: Record<string, number>;
    typicalUsdNote?: string;
    roundUpTo?: number | null;
  } | null;
  if (!body?.country) {
    return NextResponse.json({ message: 'Country code is required.' }, { status: 400 });
  }
  try {
    const rule = await upsertStarsGeoRule({
      country: body.country,
      name: body.name,
      enabled: body.enabled,
      mode: body.mode,
      discountPercent: body.discountPercent,
      customStars: body.customStars,
      typicalUsdNote: body.typicalUsdNote,
      roundUpTo: body.roundUpTo,
    });
    return NextResponse.json({ rule });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not save country.';
    return NextResponse.json({ message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const denied = await denyAdmin(req);
  if (denied) return denied;
  const country = req.nextUrl.searchParams.get('country') || '';
  const ok = await deleteStarsGeoRule(country);
  if (!ok) return NextResponse.json({ message: 'Country not found.' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
