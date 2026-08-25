'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import JsonLd from './JsonLd';
import { breadcrumbJsonLd, getBreadcrumbs } from '@/lib/breadcrumbs';

export default function Breadcrumbs() {
  const pathname = usePathname();
  const items = getBreadcrumbs(pathname);
  if (items.length < 2) return null;

  return (
    <>
      <JsonLd data={breadcrumbJsonLd(items)} />
      <nav aria-label="Breadcrumb" className="border-b border-white/[0.06] bg-black">
        <ol className="safe-x mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-1 gap-y-1 py-2 text-[12px] leading-none sm:py-2.5 sm:text-[13px]">
          {items.map((item, index) => {
            const last = index === items.length - 1;
            return (
              <li key={`${item.path}-${index}`} className="flex min-w-0 items-center gap-1">
                {index > 0 ? (
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-white/30" aria-hidden />
                ) : null}
                {last ? (
                  <span aria-current="page" className="truncate font-medium text-white/70">
                    {item.name}
                  </span>
                ) : (
                  <Link
                    href={item.path}
                    className="truncate text-white/45 transition-colors hover:text-white hover:underline hover:underline-offset-2"
                  >
                    {item.name}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
