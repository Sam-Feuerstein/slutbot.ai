'use client';

import { Lock } from 'lucide-react';
import { checkoutHref } from '@/lib/site';

export default function LockedVideoCard({
  previewUrl,
  className = '',
}: {
  previewUrl?: string;
  className?: string;
}) {
  return (
    <div className={`relative overflow-hidden bg-black ${className}`}>
      {previewUrl ? (
        <video
          src={previewUrl}
          className="h-full w-full object-contain"
          controls
          playsInline
          preload="metadata"
          controlsList="nodownload noplaybackrate noremoteplayback"
          disablePictureInPicture
        />
      ) : (
        <div className="flex aspect-[3/4] h-full min-h-[240px] w-full items-center justify-center bg-[#111]" />
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/80 via-black/20 to-transparent" />
      <div className="absolute inset-x-0 top-0 flex flex-col items-center gap-2 p-4 text-center">
        <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-white/80">
          <Lock className="h-3.5 w-3.5" />
          Locked preview
        </p>
        <a
          href={checkoutHref({ plan: 'flirt', reason: 'unlock_preview' })}
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#ff2d78] px-4 py-2.5 text-sm font-extrabold text-white shadow-[0_0_20px_rgba(255,45,120,0.35)] hover:bg-[#ff1a6b]"
        >
          Pay to unlock
        </a>
      </div>
    </div>
  );
}
