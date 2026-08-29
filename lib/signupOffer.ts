'use client';

import { useEffect, useState } from 'react';
import { CURRENCY_NAME, getAuthToken } from '@/lib/desires';

export function signupOfferCopy(stars: number): string {
  return `Create an account and get ${stars} free ${CURRENCY_NAME}`;
}

export function useGuestSignupStars(): number {
  const [stars, setStars] = useState(0);

  useEffect(() => {
    if (getAuthToken()) {
      setStars(0);
      return;
    }

    let cancelled = false;
    void fetch('/api/signup-offer', { cache: 'no-store' })
      .then(async (res) => {
        const json = (await res.json()) as { stars?: number };
        const next = Math.max(0, Math.round(Number(json.stars) || 0));
        if (!cancelled && !getAuthToken()) setStars(next);
      })
      .catch(() => {
        if (!cancelled) setStars(0);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return stars;
}
