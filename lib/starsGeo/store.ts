import connectDB from '@/lib/db/mongodb';
import { PlatformSettings, StarsGeoRuleModel } from '@/lib/models';
import { starsGeoCatalogPacks } from './catalog';
import { ASIAN_STAR_MARKETS, COUNTRY_NAMES, HIGH_COST_STAR_MARKETS, countryName, normalizeCountryCode } from './countries';
import { countryFromHeaders } from './detect';
import { applyStarsGeoPrice, clampRoundUpTo, DEFAULT_ROUND_UP_TO, MAX_DISCOUNT_PERCENT } from './pricing';
import type { StarsGeoConfig, StarsGeoMode, StarsGeoQuote, StarsGeoRule } from './types';

type RuleDoc = {
  country?: string;
  name?: string;
  enabled?: boolean;
  mode?: StarsGeoMode;
  discountPercent?: number;
  customStars?: Record<string, number>;
  typicalUsdNote?: string;
  roundUpTo?: number | null;
};

function toRule(doc: RuleDoc): StarsGeoRule {
  const country = normalizeCountryCode(doc.country || '');
  return {
    country,
    name: (doc.name || '').trim() || countryName(country),
    enabled: doc.enabled !== false,
    mode: doc.mode === 'custom_stars' ? 'custom_stars' : 'discount_percent',
    discountPercent: Math.min(MAX_DISCOUNT_PERCENT, Math.max(0, Number(doc.discountPercent) || 0)),
    customStars: sanitizeCustomStars(doc.customStars),
    typicalUsdNote: (doc.typicalUsdNote || '').trim(),
    roundUpTo: doc.roundUpTo == null ? null : clampRoundUpTo(doc.roundUpTo),
  };
}

function sanitizeCustomStars(input?: Record<string, number> | null): Record<string, number> {
  const out: Record<string, number> = {};
  if (!input || typeof input !== 'object') return out;
  for (const plan of starsGeoCatalogPacks()) {
    const n = Number(input[plan.id]);
    if (Number.isFinite(n) && n >= 1) out[plan.id] = Math.round(n);
  }
  return out;
}

export async function getStarsGeoConfig(): Promise<StarsGeoConfig> {
  await connectDB();
  const doc = (await PlatformSettings.findOne({ key: 'platform' }).lean()) as {
    starsGeoEnabled?: boolean;
    starsGeoRoundUpTo?: number;
  } | null;
  return {
    enabled: false,
    roundUpTo: clampRoundUpTo(doc?.starsGeoRoundUpTo, DEFAULT_ROUND_UP_TO),
  };
}

export async function setStarsGeoConfig(input: Partial<StarsGeoConfig>): Promise<StarsGeoConfig> {
  await connectDB();
  const current = await getStarsGeoConfig();
  const enabled = typeof input.enabled === 'boolean' ? input.enabled : current.enabled;
  const roundUpTo = input.roundUpTo != null ? clampRoundUpTo(input.roundUpTo, current.roundUpTo) : current.roundUpTo;
  await PlatformSettings.findOneAndUpdate(
    { key: 'platform' },
    { $set: { starsGeoEnabled: enabled, starsGeoRoundUpTo: roundUpTo } },
    { upsert: true, new: true },
  );
  return { enabled, roundUpTo };
}

export async function listStarsGeoRules(): Promise<StarsGeoRule[]> {
  await connectDB();
  const rows = (await StarsGeoRuleModel.find({}).sort({ country: 1 }).lean()) as RuleDoc[];
  return rows.map(toRule);
}

export async function upsertStarsGeoRule(input: Partial<StarsGeoRule> & { country: string }): Promise<StarsGeoRule> {
  const country = normalizeCountryCode(input.country);
  if (country.length !== 2) {
    throw new Error('Use a 2-letter country code (for example GB or DE).');
  }
  await connectDB();
  const next: StarsGeoRule = toRule({
    ...input,
    country,
    name: input.name || COUNTRY_NAMES[country] || country,
  });
  const saved = (await StarsGeoRuleModel.findOneAndUpdate(
    { country },
    {
      $set: {
        country: next.country,
        name: next.name,
        enabled: next.enabled,
        mode: next.mode,
        discountPercent: next.discountPercent,
        customStars: next.customStars,
        typicalUsdNote: next.typicalUsdNote,
        roundUpTo: next.roundUpTo,
      },
    },
    { upsert: true, new: true },
  ).lean()) as RuleDoc;
  return toRule(saved);
}

export async function deleteStarsGeoRule(country: string): Promise<boolean> {
  const code = normalizeCountryCode(country);
  if (code.length !== 2) return false;
  await connectDB();
  const res = await StarsGeoRuleModel.deleteOne({ country: code });
  return (res.deletedCount ?? 0) > 0;
}

async function seedCountries(
  countries: readonly string[],
  discountPercent: number,
  typicalUsdNote: string,
): Promise<StarsGeoRule[]> {
  await connectDB();
  const created: StarsGeoRule[] = [];
  for (const country of countries) {
    const existing = (await StarsGeoRuleModel.findOne({ country }).lean()) as RuleDoc | null;
    if (existing) continue;
    created.push(
      await upsertStarsGeoRule({
        country,
        name: countryName(country),
        enabled: true,
        mode: 'discount_percent',
        discountPercent,
        customStars: {},
        typicalUsdNote,
        roundUpTo: null,
      }),
    );
  }
  return created;
}

export async function seedHighCostStarMarkets(discountPercent = 20): Promise<StarsGeoRule[]> {
  return seedCountries(HIGH_COST_STAR_MARKETS, discountPercent, '~$25 storefront — discounted toward ~$20');
}

export async function seedAsianStarMarkets(discountPercent = 20): Promise<StarsGeoRule[]> {
  return seedCountries(ASIAN_STAR_MARKETS, discountPercent, 'Asia — high Stars fees, 20% off');
}

export function buildQuote(input: {
  country: string;
  config: StarsGeoConfig;
  rule: StarsGeoRule | null;
}): StarsGeoQuote {
  const country = normalizeCountryCode(input.country);
  const packs: StarsGeoQuote['packs'] = {};
  const matched = Boolean(input.config.enabled && input.rule?.enabled);
  const roundUpTo = clampRoundUpTo(input.rule?.roundUpTo, input.config.roundUpTo);
  for (const plan of starsGeoCatalogPacks()) {
    packs[plan.id] = {
      planId: plan.id,
      baseStars: plan.stars,
      stars: applyStarsGeoPrice(plan.stars, plan.id, matched ? input.rule : null, input.config.roundUpTo),
    };
  }
  return {
    enabled: input.config.enabled,
    country,
    countryName: country ? countryName(country) : 'Unknown',
    matched,
    roundUpTo,
    discountPercent: matched && input.rule?.mode === 'discount_percent' ? input.rule.discountPercent : 0,
    packs,
  };
}

export async function quoteStarsForCountry(country: string): Promise<StarsGeoQuote> {
  const [config, rules] = await Promise.all([getStarsGeoConfig(), listStarsGeoRules()]);
  const code = normalizeCountryCode(country);
  const rule = rules.find((row) => row.country === code && row.enabled) ?? null;
  return buildQuote({ country: code, config, rule });
}

export async function quoteStarsForHeaders(headers: Headers): Promise<StarsGeoQuote> {
  return quoteStarsForCountry(countryFromHeaders(headers));
}

export function starsForPlan(quote: StarsGeoQuote, planId: string, fallback: number): number {
  return quote.packs[planId]?.stars ?? fallback;
}
