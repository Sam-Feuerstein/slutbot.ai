'use client';

import { useEffect, useRef, useState } from 'react';
import type { HomePreset } from '@/lib/homePresets';
import { maxAutoplayingVideos } from '@/lib/media/autoplay';
import HomePresetCard from './HomePresetCard';

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
  const gridRef = useRef<HTMLDivElement>(null);
  const [playingIds, setPlayingIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const cards = Array.from(grid.querySelectorAll<HTMLElement>('[data-preset-id]'));
    const visible = new Map<string, number>();

    const publish = () => {
      const limit = maxAutoplayingVideos();
      const next = [...visible.entries()]
        .sort((a, b) => a[1] - b[1])
        .slice(0, limit)
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
        rootMargin: '40px 0px',
        threshold: 0.35,
      },
    );

    cards.forEach((card) => observer.observe(card));
    window.addEventListener('resize', publish);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', publish);
    };
  }, [presets]);

  return (
    <div ref={gridRef} className="grid w-full grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
      {presets.map((preset, index) => (
        <HomePresetCard
          key={preset.id}
          preset={preset}
          playing={playingIds.has(preset.id)}
          eager={index < 2}
        />
      ))}
    </div>
  );
}
