import Link from 'next/link';
import { GENERATOR_PATH } from '@/lib/site';

export default function ExploreTabs() {
  return (
    <div className="py-3 sm:py-4">
      <nav className="scrollbar-none -mx-3 flex items-end gap-5 overflow-x-auto border-b border-white/10 px-3 sm:mx-0 sm:gap-6 sm:px-0">
        <Link
          href="/"
          className="shrink-0 whitespace-nowrap border-b-[3px] border-[#ff2d78] pb-3 text-sm font-extrabold uppercase tracking-wide text-white"
        >
          Explore
        </Link>
        <Link
          href={GENERATOR_PATH}
          className="shrink-0 whitespace-nowrap pb-3 text-sm font-bold uppercase tracking-wide text-white/45 transition-colors hover:text-white"
        >
          🔥 AI porn generator
        </Link>
        <Link
          href="/archive"
          className="shrink-0 whitespace-nowrap pb-3 text-sm font-bold uppercase tracking-wide text-white/45 transition-colors hover:text-white"
        >
          My collection
        </Link>
      </nav>
    </div>
  );
}
