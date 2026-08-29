import { NextRequest, NextResponse } from 'next/server';
import { isTrialEligibleCountry, resolveRequestCountry } from '@/lib/geo/tier1';
import { TRIAL_CREDITS } from '@/lib/trial/config';

export async function GET(req: NextRequest) {
  const country = resolveRequestCountry(req.headers);
  const stars = isTrialEligibleCountry(country) ? TRIAL_CREDITS : 0;
  return NextResponse.json(
    { stars },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
