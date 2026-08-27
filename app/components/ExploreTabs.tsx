'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { EXPLORE_PATH, GENERATOR_PATH } from '@/lib/site';

const TABS = [
  { href: EXPLORE_PATH, label: 'Explore', match: (path: string) => path === EXPLORE_PATH },
  {
    href: GENERATOR_PATH,
    label: '🔥 AI porn generator',
    match: (path: string) => path === GENERATOR_PATH || path.startsWith(`${GENERATOR_PATH}/`),
  },
  { href: '/archive', label: 'My collection', match: (path: string) => path === '/archive' },
] as const;

export default function ExploreTabs() {
  const pathname = usePathname();

  return (
    <div className="py-3 sm:py-4">
      <nav className="scrollbar-none -mx-3 flex items-end gap-5 overflow-x-auto border-b border-white/10 px-3 sm:mx-0 sm:gap-6 sm:px-0">
        {TABS.map(({ href, label, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={href}
              href={href}
              className={
                active
                  ? 'shrink-0 whitespace-nowrap border-b-[3px] border-[#ff2d78] pb-3 text-sm font-extrabold uppercase tracking-wide text-white'
                  : 'shrink-0 whitespace-nowrap pb-3 text-sm font-bold uppercase tracking-wide text-white/45 transition-colors hover:text-white'
              }
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
