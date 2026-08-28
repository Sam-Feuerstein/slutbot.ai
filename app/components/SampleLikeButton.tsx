'use client';

import { Heart } from 'lucide-react';

export default function SampleLikeButton({
  liked,
  count,
  onToggle,
}: {
  liked: boolean;
  count: number;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className="flex flex-col items-center gap-1"
      aria-label={liked ? 'Unlike' : 'Like'}
      aria-pressed={liked}
    >
      <span
        className={`inline-flex h-11 w-11 items-center justify-center rounded-full border backdrop-blur-sm transition-colors ${
          liked
            ? 'border-[#ff2d78]/50 bg-[#ff2d78]/25 text-[#ff6b9d]'
            : 'border-white/20 bg-black/45 text-white/85 hover:bg-black/55 hover:text-white'
        }`}
      >
        <Heart className={`h-5 w-5 ${liked ? 'fill-current' : ''}`} strokeWidth={2.5} />
      </span>
      <span className="text-xs font-bold tabular-nums text-white/90">{formatMockLikes(count)}</span>
    </button>
  );
}

function formatMockLikes(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}K`;
  if (n >= 1000) {
    const v = n / 1000;
    return `${v.toFixed(1).replace(/\.0$/, '')}K`;
  }
  return String(n);
}
