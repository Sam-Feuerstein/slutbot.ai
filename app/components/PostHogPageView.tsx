'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { capturePosthogEvent } from '@/lib/posthog';

export default function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const search = searchParams.toString();
    const url = `${window.location.origin}${pathname}${search ? `?${search}` : ''}`;
    capturePosthogEvent('$pageview', {
      $current_url: url,
      path: pathname,
    });
  }, [pathname, searchParams]);

  return null;
}
