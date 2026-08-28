'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { maxAutoplayingVideos } from '@/lib/media/autoplay';
import type { ExampleVideo } from '@/lib/exampleVideos';
import { trackSampleClick } from '@/lib/samples/client';
import { generatorModePath } from '@/lib/site';
import ExploreExampleCard from './ExploreExampleCard';
import ExploreExampleLightbox from './ExploreExampleLightbox';

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
  const router = useRouter();
  const gridRef = useRef<HTMLDivElement>(null);
  const [playingIds, setPlayingIds] = useState<Set<string>>(() => new Set());
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const closePreview = useCallback(() => setPreviewIndex(null), []);

  const previewExample = previewIndex === null ? null : examples[previewIndex];

  const goToPreview = useCallback((index: number) => {
    const example = examples[index];
    if (!example) return;
    trackSampleClick(example.id);
    setPreviewIndex(index);
  }, [examples]);

  const shiftPreview = useCallback(
    (delta: number) => {
      setPreviewIndex((current) => {
        if (current === null) return null;
        const next = current + delta;
        if (next < 0 || next >= examples.length) return current;
        trackSampleClick(examples[next].id);
        return next;
      });
    },
    [examples],
  );

  const goToGenerator = useCallback(
    (example: ExampleVideo) => {
      router.push(generatorModePath(example.video ? 'video' : 'image', example.id));
    },
    [router],
  );

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
  }, [examples]);

  return (
    <>
      <div ref={gridRef} className="grid w-full grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 md:gap-x-5 md:gap-y-10 lg:grid-cols-5 lg:gap-x-6 lg:gap-y-12">
        {examples.map((example, index) => (
          <ExploreExampleCard
            key={example.id}
            example={example}
            playing={playingIds.has(example.id)}
            eager={index < 2}
            onOpenPreview={() => goToPreview(index)}
          />
        ))}
      </div>

      {previewExample && previewIndex !== null ? (
        <ExploreExampleLightbox
          example={previewExample}
          index={previewIndex}
          total={examples.length}
          hasPrev={previewIndex > 0}
          hasNext={previewIndex < examples.length - 1}
          onPrev={() => shiftPreview(-1)}
          onNext={() => shiftPreview(1)}
          onClose={closePreview}
          onTry={() => {
            closePreview();
            goToGenerator(previewExample);
          }}
        />
      ) : null}
    </>
  );
}
