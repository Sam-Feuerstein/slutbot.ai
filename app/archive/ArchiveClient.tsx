'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import SiteHeader from '../components/SiteHeader';
import { purgeAllLocalCollectionCaches } from '@/lib/collectionLocal';
import { getAuthToken } from '@/lib/desires';
import { ARCHIVE_PATH, GENERATOR_PATH, loginHref } from '@/lib/site';

/**
 * EMERGENCY LOCKDOWN — do not render any generation media on /archive
 * while the cross-account privacy leak is under containment.
 */
export default function ArchiveClient() {
  const router = useRouter();

  useEffect(() => {
    if (!getAuthToken()) {
      router.replace(loginHref(ARCHIVE_PATH));
      return;
    }
    purgeAllLocalCollectionCaches();
  }, [router]);

  return (
    <div className="w-full text-white">
      <SiteHeader />
      <div className="mx-auto w-full max-w-6xl px-3 py-6 pb-[max(1.5rem,var(--safe-bottom))] sm:px-4 sm:py-14">
        <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#ff2d78]">My collection</p>
            <h1 className="text-2xl font-black tracking-tight text-white sm:text-4xl">Past generations</h1>
          </div>
          <Link
            href={GENERATOR_PATH}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-white hover:border-[#ff2d78]/40"
          >
            Back to generator
          </Link>
        </div>

        <div className="rounded-2xl border border-amber-300/30 bg-amber-400/10 p-8 text-center sm:p-10">
          <p className="text-base font-bold text-amber-100 sm:text-lg">Collection temporarily locked</p>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-white/70">
            We temporarily disabled My Collection while fixing a privacy bug. Your generations are not shown to
            anyone right now — including you — until this is fully secured.
          </p>
          <Link
            href={GENERATOR_PATH}
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#ff2d78] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#ff1a6b]"
          >
            Back to generator
          </Link>
        </div>
      </div>
    </div>
  );
}
