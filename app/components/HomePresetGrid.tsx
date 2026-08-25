'use client';

import { useEffect, useRef, useState } from 'react';
import type { HomePreset } from '@/lib/homePresets';
import HomePresetCard from './HomePresetCard';

const MAX_PLAYING = 6;

function useGridColumns() {
  const [cols, setCols] = useState(2);

  useEffect(() => {
    const update = () => {
      if (window.matchMedia('(min-width: 1024px)').matches) setCols(5);
      else if (window.matchMedia('(min-width: 768px)').matches) setCols(3);
      else setCols(2);
    };

    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return cols;
}

function getScrollParent(node: HTMLElement | null): Element | null {
  let current = node?.parentElement;
  while (current) {
    const style = window.getComputedStyle(current);
    if (/(auto|scroll)/.test(style.overflowY)) return current;
    current = current.parentElement;
  }
  return null;
}

export default function HomePresetGrid({ presets }: { presets: HomePreset[] }) {
  const cols = useGridColumns();
  const gridRef = useRef<HTMLDivElement>(null);
  const [playingIds, setPlayingIds] = useState<Set<string>>(
    () => new Set(presets.slice(0, MAX_PLAYING).map((preset) => preset.id)),
  );

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const cards = Array.from(grid.querySelectorAll<HTMLElement>('[data-preset-id]'));
    const visible = new Map<string, number>();

    const publish = () => {
      const next = [...visible.entries()]
        .sort((a, b) => a[1] - b[1])
        .slice(0, MAX_PLAYING)
        .map(([id]) => id);

      setPlayingIds((current) => {
        if (current.size === next.length && next.every((id) => current.has(id))) {
          return current;
        }
        return new Set(next);
      });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).dataset.presetId;
          if (!id) continue;
          if (entry.isIntersecting) {
            visible.set(id, entry.boundingClientRect.top);
          } else {
            visible.delete(id);
          }
        }
        publish();
      },
      {
        root: getScrollParent(grid),
        rootMargin: '80px 0px',
        threshold: 0.2,
      },
    );

    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [presets]);

  return (
    <div ref={gridRef} className="grid w-full grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
      {presets.map((preset, index) => (
        <HomePresetCard
          key={preset.id}
          preset={preset}
          playing={playingIds.has(preset.id)}
          eager={index < cols}
        />
      ))}
    </div>
  );
}
