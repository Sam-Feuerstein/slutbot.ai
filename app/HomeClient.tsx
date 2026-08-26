'use client';

import { Suspense } from 'react';
import ExploreTabs from './components/ExploreTabs';
import HomePresetGrid from './components/HomePresetGrid';
import PaymentSuccessBanner from './components/PaymentSuccessBanner';
import PromoBanner from './components/PromoBanner';
import SiteHeader from './components/SiteHeader';
import { HOME_PRESETS } from '@/lib/homePresets';

export default function HomeClient() {
  return (
    <div className="w-full text-white">
      <div className="bg-[#4a122c]">
        <SiteHeader />
        <Suspense fallback={null}>
          <PaymentSuccessBanner />
        </Suspense>

        <div className="safe-x mx-auto max-w-[1600px]">
          <div className="pt-3 sm:pt-5">
            <PromoBanner />
          </div>
          <ExploreTabs />
        </div>
      </div>

      <main className="safe-x mx-auto max-w-[1600px] pb-[max(1.5rem,var(--safe-bottom))] sm:pb-8">
        <HomePresetGrid presets={HOME_PRESETS} />
      </main>
    </div>
  );
}
