'use client';

import { useViewAs } from '@/lib/auth/useViewAs';
import type { AccountTier } from '@/lib/viewAs';

const OPTIONS: { id: AccountTier; label: string }[] = [
  { id: 'free', label: 'Free' },
  { id: 'paid', label: 'Paid' },
  { id: 'ultra', label: 'ULTRA' },
];

export default function AdminViewAsSwitch({ compact = false }: { compact?: boolean }) {
  const { canPreview, preview, setPreview } = useViewAs();
  if (!canPreview || !preview) return null;

  return (
    <div className={`flex items-center gap-1.5 ${compact ? '' : 'justify-center gap-2'}`}>
      <span className={`font-bold uppercase tracking-[0.16em] text-white/70 ${compact ? 'hidden text-[9px] sm:inline' : 'text-[10px] text-white/45'}`}>
        View as
      </span>
      <div className="inline-flex rounded-full border border-white/20 bg-black/60 p-0.5 backdrop-blur-md">
        {OPTIONS.map((option) => {
          const active = preview === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setPreview(option.id)}
              className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide transition ${
                active ? 'bg-[#ff2d78] text-white' : 'text-white/50 hover:text-white'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
