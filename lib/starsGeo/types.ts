export type StarsGeoMode = 'discount_percent' | 'custom_stars';

export type StarsGeoRule = {
  country: string;
  name: string;
  enabled: boolean;
  mode: StarsGeoMode;
  discountPercent: number;
  customStars: Record<string, number>;
  typicalUsdNote: string;
  roundUpTo: number | null;
};

export type StarsGeoConfig = {
  enabled: boolean;
  roundUpTo: number;
};

export type StarsGeoQuotePack = {
  planId: string;
  baseStars: number;
  stars: number;
};

export type StarsGeoQuote = {
  enabled: boolean;
  country: string;
  countryName: string;
  matched: boolean;
  roundUpTo: number;
  discountPercent: number;
  packs: Record<string, StarsGeoQuotePack>;
};
