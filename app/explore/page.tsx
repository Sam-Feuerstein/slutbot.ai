import type { Metadata } from 'next';
import ExploreTabs from '@/app/components/ExploreTabs';
import ExploreTikTokFeed from '@/app/components/ExploreTikTokFeed';
import SiteHeader from '@/app/components/SiteHeader';
import { HOME_PRESETS } from '@/lib/homePresets';
import { buildPageMetadata } from '@/lib/seo';
import { EXPLORE_PATH } from '@/lib/site';

export const metadata: Metadata = buildPageMetadata({
  title: 'Explore AI Nude Videos',
  description:
    'Browse AI SLUTBOT video presets — blowjob, cumshot, doggy, missionary, and more. Pick a clip, upload a photo, and generate uncensored AI nude videos. 18+ only.',
  path: EXPLORE_PATH,
  ogTitle: 'Explore AI Nude Videos | AI SLUTBOT',
});

export default function ExplorePage() {
  return (
    <div className="flex h-dvh max-h-dvh flex-col overflow-hidden bg-black text-white">
      <div className="shrink-0 bg-[#4a122c]">
        <SiteHeader />
        <div className="safe-x mx-auto max-w-[1600px]">
          <ExploreTabs />
        </div>
      </div>

      <main className="relative min-h-0 flex-1">
        <h1 className="sr-only">Explore feed — AI video presets</h1>
        <ExploreTikTokFeed presets={HOME_PRESETS} />
      </main>
    </div>
  );
}
