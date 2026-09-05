'use client';

import { useViewAs } from '@/lib/auth/useViewAs';
import type { AccountTier } from '@/lib/viewAs';

const OPTIONS: { id: AccountTier; label: string }[] = [
  { id: 'free', label: 'Free' },
  { id: 'paid', label: 'Paid' },
  { id: 'ultra', label: 'ULTRA' },
];

export default function AdminViewAsSwitch() {
  const { canPreview, preview, setPreview } = useViewAs();
  if (!canPreview || !preview) return null;

  return (
    <div className="flex items-center justify-center gap-2">
      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">View as</span>
      <div className="inline-flex rounded-full border border-white/15 bg-black/50 p-0.5">
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
