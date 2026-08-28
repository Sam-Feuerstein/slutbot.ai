import { Suspense } from 'react';
import ExploreExampleGrid from './components/ExploreExampleGrid';
import BeforeAfterShowcase from './components/BeforeAfterShowcase';
import PaymentSuccessBanner from './components/PaymentSuccessBanner';
import PromoBanner from './components/PromoBanner';
import SiteHeader from './components/SiteHeader';
import { EXAMPLE_VIDEOS } from '@/lib/exampleVideos';
import { BEFORE_AFTER_EXAMPLES } from '@/lib/beforeAfterExamples';
import { listHeroDemos, listPublicBeforeAfter, listPublicExamples } from '@/lib/samples';
import type { PublicHeroDemo } from '@/lib/samples';

const FALLBACK_HERO: [PublicHeroDemo, PublicHeroDemo] = [
  { id: 'example-ex-1', poster: '/examples/example-ex-1.jpg', video: '/examples/example-ex-1.mp4' },
  { id: 'example-ex-2', poster: '/examples/example-ex-2.jpg', video: '/examples/example-ex-2.mp4' },
];

export default async function HomeClient() {
  let examples = EXAMPLE_VIDEOS;
  let beforeAfter = BEFORE_AFTER_EXAMPLES;
  let heroDemos: [PublicHeroDemo, PublicHeroDemo] = FALLBACK_HERO;

  try {
    const [publicExamples, publicBeforeAfter, hero] = await Promise.all([
      listPublicExamples(),
      listPublicBeforeAfter(),
      listHeroDemos(),
    ]);
    heroDemos = hero;
    if (publicExamples.length) {
      examples = publicExamples.map((row) => ({
        id: row.id,
        title: row.title,
        poster: row.poster,
        video: row.video,
        source: row.source,
      }));
    }
    if (publicBeforeAfter.length) {
      beforeAfter = publicBeforeAfter.map((row) => ({
        id: row.id,
        before: row.before,
        after: row.after,
        combined: row.combined,
      }));
    }
  } catch {
    // Fall back to static seed assets if Mongo is unavailable.
  }

  return (
    <div className="w-full text-white">
      <div className="bg-[linear-gradient(90deg,#000_0%,#4a122c_72%)]">
        <SiteHeader />
        <Suspense fallback={null}>
          <PaymentSuccessBanner />
        </Suspense>

        <div className="safe-x mx-auto max-w-[1600px] space-y-5 pb-6 pt-3 sm:space-y-7 sm:pb-9 sm:pt-5">
          <PromoBanner demos={heroDemos} />
          <BeforeAfterShowcase pairs={beforeAfter} />
        </div>
      </div>

      <main className="safe-x mx-auto max-w-[1600px] pb-[max(1.5rem,var(--safe-bottom))] pt-6 sm:pb-8 sm:pt-8">
        <h2 className="mb-6 text-[1.35rem] font-extrabold leading-[1.15] tracking-tight text-white sm:mb-8 sm:text-[1.85rem] lg:text-[2.15rem]">
          Some example of{' '}
          <span className="text-[#ff2d78]">AI SLUTBOT</span> Image to video nude
          generation.
        </h2>
        <ExploreExampleGrid examples={examples} />
      </main>
    </div>
  );
}
