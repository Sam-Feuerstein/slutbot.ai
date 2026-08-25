'use client';

import { usePathname } from 'next/navigation';
import InteractionTracker from './InteractionTracker';

export default function SiteChrome({
  children,
  featuredOn,
  footer,
}: {
  children: React.ReactNode;
  featuredOn?: React.ReactNode;
  footer: React.ReactNode;
}) {
  const pathname = usePathname();
  const bare =
    pathname.startsWith('/admin') || pathname.startsWith('/login') || pathname.startsWith('/checkout');
  if (bare) {
    return (
      <>
        <InteractionTracker />
        {children}
      </>
    );
  }
  return (
    <div className="flex min-h-dvh w-full flex-col">
      <InteractionTracker />
      <div className="w-full min-w-0 flex-1">{children}</div>
      {featuredOn}
      {footer}
    </div>
  );
}
