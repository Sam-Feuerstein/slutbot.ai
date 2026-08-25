export const TRACK_NAMES = [
  'page_view',
  'click',
  'checkout_view',
  'checkout_plan',
  'checkout_method',
  'checkout_pay',
  'checkout_tutorial',
  'checkout_name',
] as const;

export type TrackName = (typeof TRACK_NAMES)[number];
export type TrackKind = 'click' | 'view' | 'interaction';

const NAME_SET = new Set<string>(TRACK_NAMES);

export function isTrackName(value: string): value is TrackName {
  return NAME_SET.has(value);
}
