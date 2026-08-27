import type { Metadata } from 'next';
import ExploreTabs from '@/app/components/ExploreTabs';
import HomePresetGrid from '@/app/components/HomePresetGrid';
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
    <div className="w-full text-white">
      <div className="bg-[#4a122c]">
        <SiteHeader />
        <div className="safe-x mx-auto max-w-[1600px]">
          <ExploreTabs />
        </div>
      </div>

      <main className="safe-x mx-auto max-w-[1600px] pb-[max(1.5rem,var(--safe-bottom))] sm:pb-8">
        <h1 className="sr-only">Explore AI nude video presets</h1>
        <HomePresetGrid presets={HOME_PRESETS} />
      </main>
    </div>
  );
}
