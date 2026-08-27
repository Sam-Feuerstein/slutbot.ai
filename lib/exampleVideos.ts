export type ExampleVideo = {
  id: string;
  title: string;
  poster: string;
  video?: string;
};

const STILL_SAMPLES: ExampleVideo[] = [
  { id: 'example-sample-01', title: 'Sample', poster: '/examples/example-sample-01.jpg' },
  { id: 'example-sample-02', title: 'Sample', poster: '/examples/example-sample-02.jpg' },
  { id: 'example-slutbot-01', title: 'Sample', poster: '/examples/example-slutbot-01.jpg' },
  { id: 'example-still-01', title: 'Sample', poster: '/examples/example-still-01.jpg' },
  { id: 'example-slutbot-02', title: 'Sample', poster: '/examples/example-slutbot-02.jpg' },
  { id: 'example-still-02', title: 'Sample', poster: '/examples/example-still-02.jpg' },
  { id: 'example-slutbot-03', title: 'Sample', poster: '/examples/example-slutbot-03.jpg' },
  { id: 'example-slutbot-04', title: 'Sample', poster: '/examples/example-slutbot-04.jpg' },
  { id: 'example-slutbot-05', title: 'Sample', poster: '/examples/example-slutbot-05.jpg' },
];

const VIDEO_SAMPLES: ExampleVideo[] = [
  { id: 'example-ad074579', title: 'Example 01', video: '/examples/example-ad074579.mp4', poster: '/examples/example-ad074579.jpg' },
  { id: 'example-0ff90f6b', title: 'Example 02', video: '/examples/example-0ff90f6b.mp4', poster: '/examples/example-0ff90f6b.jpg' },
  { id: 'example-1db093a6', title: 'Example 03', video: '/examples/example-1db093a6.mp4', poster: '/examples/example-1db093a6.jpg' },
  { id: 'example-274764cf', title: 'Example 04', video: '/examples/example-274764cf.mp4', poster: '/examples/example-274764cf.jpg' },
  { id: 'example-27c3eb5a', title: 'Example 05', video: '/examples/example-27c3eb5a.mp4', poster: '/examples/example-27c3eb5a.jpg' },
  { id: 'example-34939fa0', title: 'Example 06', video: '/examples/example-34939fa0.mp4', poster: '/examples/example-34939fa0.jpg' },
  { id: 'example-592213dd', title: 'Example 07', video: '/examples/example-592213dd.mp4', poster: '/examples/example-592213dd.jpg' },
  { id: 'example-5a2e9b88', title: 'Example 08', video: '/examples/example-5a2e9b88.mp4', poster: '/examples/example-5a2e9b88.jpg' },
  { id: 'example-65dd9d12', title: 'Example 09', video: '/examples/example-65dd9d12.mp4', poster: '/examples/example-65dd9d12.jpg' },
  { id: 'example-67f0ed07', title: 'Example 10', video: '/examples/example-67f0ed07.mp4', poster: '/examples/example-67f0ed07.jpg' },
  { id: 'example-6f78bec3', title: 'Example 11', video: '/examples/example-6f78bec3.mp4', poster: '/examples/example-6f78bec3.jpg' },
  { id: 'example-8807a1a3', title: 'Example 12', video: '/examples/example-8807a1a3.mp4', poster: '/examples/example-8807a1a3.jpg' },
  { id: 'example-8958c49a', title: 'Example 13', video: '/examples/example-8958c49a.mp4', poster: '/examples/example-8958c49a.jpg' },
  { id: 'example-9a2e941b', title: 'Example 14', video: '/examples/example-9a2e941b.mp4', poster: '/examples/example-9a2e941b.jpg' },
  { id: 'example-a0551ee7', title: 'Example 15', video: '/examples/example-a0551ee7.mp4', poster: '/examples/example-a0551ee7.jpg' },
  { id: 'example-b1a31e7d', title: 'Example 16', video: '/examples/example-b1a31e7d.mp4', poster: '/examples/example-b1a31e7d.jpg' },
  { id: 'example-b5a19589', title: 'Example 17', video: '/examples/example-b5a19589.mp4', poster: '/examples/example-b5a19589.jpg' },
  { id: 'example-be9f24fc', title: 'Example 18', video: '/examples/example-be9f24fc.mp4', poster: '/examples/example-be9f24fc.jpg' },
  { id: 'example-c66f4599', title: 'Example 19', video: '/examples/example-c66f4599.mp4', poster: '/examples/example-c66f4599.jpg' },
  { id: 'example-e1e349f7', title: 'Example 20', video: '/examples/example-e1e349f7.mp4', poster: '/examples/example-e1e349f7.jpg' },
  { id: 'example-eac87879', title: 'Example 21', video: '/examples/example-eac87879.mp4', poster: '/examples/example-eac87879.jpg' },
  { id: 'example-fe2d26f6', title: 'Example 22', video: '/examples/example-fe2d26f6.mp4', poster: '/examples/example-fe2d26f6.jpg' },
  { id: 'example-left', title: 'Example 23', video: '/examples/example-left.mp4', poster: '/examples/example-left.jpg' },
];

/** Interleave photo samples with video clips so the grid alternates naturally. */
function mixExamples(stills: ExampleVideo[], videos: ExampleVideo[]): ExampleVideo[] {
  const mixed: ExampleVideo[] = [];
  const stillQueue = [...stills];
  const videoQueue = [...videos];
  let preferStill = true;

  while (stillQueue.length || videoQueue.length) {
    if (preferStill && stillQueue.length) {
      mixed.push(stillQueue.shift()!);
    } else if (videoQueue.length) {
      mixed.push(videoQueue.shift()!);
    } else if (stillQueue.length) {
      mixed.push(stillQueue.shift()!);
    }
    preferStill = !preferStill;
  }

  return mixed;
}

export const EXAMPLE_VIDEOS: ExampleVideo[] = mixExamples(STILL_SAMPLES, VIDEO_SAMPLES);

const PINNED_FIRST_IDS = ['example-sample-01', 'example-sample-02'] as const;

const CENTER_EXAMPLE_IDS = ['example-slutbot-01', 'example-still-01', 'example-05632f9b'] as const;

/** Keep featured samples first, then center-group the rest for the grid row layout. */
export function orderExamples(examples: ExampleVideo[], cols: number): ExampleVideo[] {
  const pinned = new Set<string>(PINNED_FIRST_IDS);
  const pinnedItems = PINNED_FIRST_IDS.map((id) => examples.find((example) => example.id === id)).filter(
    (example): example is ExampleVideo => Boolean(example),
  );
  const rest = examples.filter((example) => !pinned.has(example.id));
  return [...pinnedItems, ...examplesWithCenterGroup(rest, cols)];
}

/** Place featured stills and a clip in the middle of the first row. */
export function examplesWithCenterGroup(examples: ExampleVideo[], cols: number): ExampleVideo[] {
  const centerIds = new Set<string>(CENTER_EXAMPLE_IDS);
  const center = CENTER_EXAMPLE_IDS.map((id) => examples.find((example) => example.id === id)).filter(
    (example): example is ExampleVideo => Boolean(example),
  );
  const rest = examples.filter((example) => !centerIds.has(example.id));
  if (!center.length || !rest.length) return examples;

  let pad = Math.max(0, Math.floor((cols - center.length) / 2));
  if (pad === 0) pad = 1;
  pad = Math.min(pad, rest.length);

  return [...rest.slice(0, pad), ...center, ...rest.slice(pad)];
}
