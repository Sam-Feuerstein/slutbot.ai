'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { trackEvent } from '@/lib/trackClient';

function clickLabel(target: EventTarget | null): string {
  if (!(target instanceof Element)) return '';
  const el = target.closest('button, a, [role="button"]');
  if (!(el instanceof HTMLElement)) return '';
  return (el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80);
}

export default function InteractionTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith('/admin') || pathname.startsWith('/login')) return;
    trackEvent('page_view', { kind: 'view' });
  }, [pathname]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const path = window.location.pathname;
      if (path.startsWith('/admin') || path.startsWith('/login')) return;
      const label = clickLabel(event.target);
      if (!label) return;
      trackEvent('click', { kind: 'click', label });
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  return null;
}
