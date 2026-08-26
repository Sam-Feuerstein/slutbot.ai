'use client';

import { profileInitial } from '@/lib/auth/profile';

type Props = {
  name: string;
  email: string;
  avatarUrl?: string;
  size?: number;
  className?: string;
};

export default function UserAvatar({ name, email, avatarUrl, size = 32, className = '' }: Props) {
  const initial = profileInitial({ name, email });
  const px = `${size}px`;

  if (avatarUrl?.trim()) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt=""
        width={size}
        height={size}
        className={`shrink-0 rounded-full object-cover ring-2 ring-white/20 ${className}`}
        style={{ width: px, height: px }}
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#ff2d78] to-[#7a72ff] font-bold text-white ring-2 ring-white/20 ${className}`}
      style={{ width: px, height: px, fontSize: Math.max(11, Math.round(size * 0.42)) }}
    >
      {initial}
    </span>
  );
}
