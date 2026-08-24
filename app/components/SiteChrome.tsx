'use client';

import { usePathname } from 'next/navigation';

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
  const bare = pathname.startsWith('/admin') || pathname.startsWith('/login');
  if (bare) return <>{children}</>;
  return (
    <div className="flex min-h-dvh w-full flex-col">
      <div className="w-full min-w-0 flex-1">{children}</div>
      {featuredOn}
      {footer}
    </div>
  );
}
