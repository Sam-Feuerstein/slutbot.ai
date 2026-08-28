import { EXAMPLE_VIDEOS } from '@/lib/exampleVideos';
import { BEFORE_AFTER_EXAMPLES } from '@/lib/beforeAfterExamples';
import type { SampleInput } from './types';

/** Current hardcoded hero demos — seeded so admins can reassign those slots. */
export const DEFAULT_HERO_SAMPLES: SampleInput[] = [
  {
    id: 'example-ex-1',
    kind: 'example',
    title: 'Hero left',
    posterUrl: '/examples/example-ex-1.jpg',
    videoUrl: '/examples/example-ex-1.mp4',
    sortOrder: -2,
    enabled: true,
    pinned: false,
    heroSlot: 1,
  },
  {
    id: 'example-ex-2',
    kind: 'example',
    title: 'Hero right',
    posterUrl: '/examples/example-ex-2.jpg',
    videoUrl: '/examples/example-ex-2.mp4',
    sortOrder: -1,
    enabled: true,
    pinned: false,
    heroSlot: 2,
  },
];

/** One-time seed payload from the current static homepage assets. */
export function seedSampleInputs(): SampleInput[] {
  const examples: SampleInput[] = [
    ...DEFAULT_HERO_SAMPLES,
    ...EXAMPLE_VIDEOS.map((example, index) => ({
      id: example.id,
      kind: 'example' as const,
      title: example.title || `Example ${index + 1}`,
      posterUrl: example.poster,
      videoUrl: example.video || '',
      sortOrder: index,
      enabled: true,
      pinned: example.id === 'example-sample-01' || example.id === 'example-sample-02',
      heroSlot: 0 as const,
    })),
  ];

  const beforeAfter: SampleInput[] = BEFORE_AFTER_EXAMPLES.map((pair, index) => ({
    id: pair.id,
    kind: 'before_after',
    title: `Before / After ${index + 1}`,
    beforeUrl: pair.before,
    afterUrl: pair.after,
    combinedUrl: pair.combined || '',
    sortOrder: index,
    enabled: true,
    pinned: false,
    heroSlot: 0,
  }));

  return [...examples, ...beforeAfter];
}
