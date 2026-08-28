export type SampleKind = 'example' | 'before_after';

export type SampleRecord = {
  id: string;
  kind: SampleKind;
  /** Admin-facing label so you can identify the card. */
  title: string;
  /** Example still / video poster. */
  posterUrl: string;
  /** Example video clip (optional — stills omit this). */
  videoUrl: string;
  /** Original photo for video cards (corner thumb + lightbox). */
  sourceUrl: string;
  /** Before/after pair. */
  beforeUrl: string;
  afterUrl: string;
  combinedUrl: string;
  sortOrder: number;
  enabled: boolean;
  pinned: boolean;
  /** 1 or 2 = shown in the homepage hero; 0 = not in hero. */
  heroSlot: 0 | 1 | 2;
  createdAt: string;
  updatedAt: string;
};

export type SampleCountryStat = {
  country: string;
  clicks: number;
  likes: number;
};

export type SampleMetrics = {
  clicks24h: number;
  clicks7d: number;
  clicksTotal: number;
  likes24h: number;
  likes7d: number;
  likesTotal: number;
  byCountry: SampleCountryStat[];
};

export type SampleWithMetrics = SampleRecord & { metrics: SampleMetrics };

export type PublicExampleSample = {
  id: string;
  title: string;
  poster: string;
  video?: string;
  source?: string;
  likeCount: number;
};

export type PublicBeforeAfterSample = {
  id: string;
  before: string;
  after: string;
  combined?: string;
  likeCount: number;
};

export type PublicHeroDemo = {
  id: string;
  poster: string;
  video?: string;
};

export type SampleInput = {
  id?: string;
  kind: SampleKind;
  title?: string;
  posterUrl?: string;
  videoUrl?: string;
  sourceUrl?: string;
  beforeUrl?: string;
  afterUrl?: string;
  combinedUrl?: string;
  sortOrder?: number;
  enabled?: boolean;
  pinned?: boolean;
  heroSlot?: 0 | 1 | 2;
};

export type SampleEngageAction = 'click' | 'like' | 'unlike';
