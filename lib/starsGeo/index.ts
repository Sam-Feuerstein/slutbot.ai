/**
 * Copy `lib/starsGeo` into another app, then:
 * 1. Point `catalog.ts` at that app’s pack list.
 * 2. Serve GET quotes from `quoteStarsForHeaders`.
 * 3. Invoice the amount from `starsForPlan` (never a client-sent Stars value).
 * 4. Reuse the admin CRUD in `store.ts` behind your own admin auth.
 */
export type { StarsGeoConfig, StarsGeoMode, StarsGeoQuote, StarsGeoQuotePack, StarsGeoRule } from './types';
export type { StarsGeoCatalogPack } from './catalog';
export { starsGeoCatalogPacks } from './catalog';
export { ASIAN_STAR_MARKETS, COUNTRY_NAMES, HIGH_COST_STAR_MARKETS, countryName, normalizeCountryCode } from './countries';
export { countryFromHeaders } from './detect';
export { applyStarsGeoPrice, clampRoundUpTo, DEFAULT_ROUND_UP_TO, MAX_DISCOUNT_PERCENT, roundStarsUp } from './pricing';
export {
  buildQuote,
  deleteStarsGeoRule,
  getStarsGeoConfig,
  listStarsGeoRules,
  quoteStarsForCountry,
  quoteStarsForHeaders,
  seedAsianStarMarkets,
  seedHighCostStarMarkets,
  setStarsGeoConfig,
  starsForPlan,
  upsertStarsGeoRule,
} from './store';
