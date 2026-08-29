'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signupOfferCopy, useGuestSignupStars } from '@/lib/signupOffer';
import { loginHref } from '@/lib/site';

const YELLOW_BTN =
  'inline-flex items-center justify-center rounded-md border-[2.5px] border-black bg-[#ffe600] text-center font-black uppercase tracking-[0.04em] text-black shadow-[3px_3px_0_0_#000] transition-[transform,box-shadow] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_#000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none';

export default function GuestSignupOffer({
  className = '',
  compact = false,
  asText = false,
}: {
  className?: string;
  compact?: boolean;
  asText?: boolean;
}) {
  const pathname = usePathname();
  const stars = useGuestSignupStars();
  if (!stars) return null;

  const copy = signupOfferCopy(stars);
  const styles = [
    YELLOW_BTN,
    compact
      ? 'h-9 max-w-[11.5rem] px-2 text-[8px] leading-tight sm:h-10 sm:max-w-[14rem] sm:px-3 sm:text-[10px] sm:tracking-[0.06em]'
      : 'min-h-11 w-full px-3.5 py-2.5 text-[11px] leading-snug sm:text-xs sm:tracking-[0.06em]',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (asText) {
    return <p className={styles}>{copy}</p>;
  }

  return (
    <Link href={loginHref(pathname)} className={styles}>
      {copy}
    </Link>
  );
}
