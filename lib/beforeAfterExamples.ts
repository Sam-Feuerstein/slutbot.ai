import { exampleMediaUrl } from '@/lib/presetMedia';

export type BeforeAfterPair = {
  id: string;
  before: string;
  after: string;
  /** Full side-by-side preview shown in the lightbox when set. */
  combined?: string;
};

const RAW_BEFORE_AFTER_EXAMPLES: BeforeAfterPair[] = [
  {
    id: 'before-after-01',
    before: '/examples/before-after/pair-01-before.jpg',
    after: '/examples/before-after/pair-01-after.jpg',
  },
  {
    id: 'before-after-02',
    before: '/examples/before-after/pair-02-before.jpg',
    after: '/examples/before-after/pair-02-after.jpg',
    combined: '/examples/before-after/pair-02-combined.jpg',
  },
  {
    id: 'before-after-03',
    before: '/examples/before-after/pair-03-before.jpg',
    after: '/examples/before-after/pair-03-after.jpg',
  },
  {
    id: 'before-after-04',
    before: '/examples/before-after/pair-04-before.jpg',
    after: '/examples/before-after/pair-04-after.jpg',
  },
  {
    id: 'before-after-05',
    before: '/examples/before-after/pair-05-before.jpg',
    after: '/examples/before-after/pair-05-after.jpg',
    combined: '/examples/before-after/pair-05-combined.jpg',
  },
  {
    id: 'before-after-06',
    before: '/examples/before-after/pair-06-before.jpg',
    after: '/examples/before-after/pair-06-after.jpg',
    combined: '/examples/before-after/pair-06-combined.jpg',
  },
];

export const BEFORE_AFTER_EXAMPLES: BeforeAfterPair[] = RAW_BEFORE_AFTER_EXAMPLES.map((pair) => ({
  ...pair,
  before: exampleMediaUrl(pair.before),
  after: exampleMediaUrl(pair.after),
  combined: pair.combined ? exampleMediaUrl(pair.combined) : pair.combined,
}));
