'use client';

import { useEffect, useRef, useState } from 'react';
import { maxAutoplayingVideos } from '@/lib/media/autoplay';
import { orderExamples, type ExampleVideo } from '@/lib/exampleVideos';
import ExploreExampleCard from './ExploreExampleCard';

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

export default function ExploreExampleGrid({ examples }: { examples: ExampleVideo[] }) {
  const cols = useGridColumns();
  const ordered = orderExamples(examples, cols);
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
  }, [ordered]);

  return (
    <div ref={gridRef} className="grid w-full grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 md:gap-x-5 md:gap-y-10 lg:grid-cols-5 lg:gap-x-6 lg:gap-y-12">
      {ordered.map((example, index) => (
        <ExploreExampleCard
          key={example.id}
          example={example}
          playing={playingIds.has(example.id)}
          eager={index < 2}
        />
      ))}
    </div>
  );
}
