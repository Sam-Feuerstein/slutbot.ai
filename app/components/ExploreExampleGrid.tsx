'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminSession } from '@/lib/auth/useAdminSession';
import { maxAutoplayingVideos } from '@/lib/media/autoplay';
import type { ExampleVideo } from '@/lib/exampleVideos';
import { SAMPLE_DELETED_EVENT } from '@/lib/samples/adminDelete';
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
  const isAdmin = useAdminSession();
  const gridRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef(examples);
  const [items, setItems] = useState(examples);
  const [playingIds, setPlayingIds] = useState<Set<string>>(() => new Set());
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const closePreview = useCallback(() => setPreviewIndex(null), []);

  itemsRef.current = items;

  useEffect(() => {
    setItems(examples);
  }, [examples]);

  useEffect(() => {
    const onDeleted = (event: Event) => {
      const id = (event as CustomEvent<{ id?: string }>).detail?.id;
      if (!id) return;
      const prev = itemsRef.current;
      const next = prev.filter((row) => row.id !== id);
      const deletedAt = prev.findIndex((row) => row.id === id);
      setItems(next);
      setPreviewIndex((current) => {
        if (current === null) return null;
        if (!next.length) return null;
        if (deletedAt < 0) return Math.min(current, next.length - 1);
        if (current > deletedAt) return current - 1;
        if (current === deletedAt) return Math.min(current, next.length - 1);
        return current;
      });
      router.refresh();
    };
    window.addEventListener(SAMPLE_DELETED_EVENT, onDeleted);
    return () => window.removeEventListener(SAMPLE_DELETED_EVENT, onDeleted);
  }, [router]);

  const previewExample = previewIndex === null ? null : items[previewIndex];

  const goToPreview = useCallback((index: number) => {
    const example = items[index];
    if (!example) return;
    trackSampleClick(example.id);
    setPreviewIndex(index);
  }, [items]);

  const shiftPreview = useCallback(
    (delta: number) => {
      setPreviewIndex((current) => {
        if (current === null) return null;
        const next = current + delta;
        if (next < 0 || next >= items.length) return current;
        trackSampleClick(items[next].id);
        return next;
      });
    },
    [items],
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
  }, [items]);

  return (
    <>
      <div ref={gridRef} className="grid w-full grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 md:gap-x-5 md:gap-y-10 lg:grid-cols-5 lg:gap-x-6 lg:gap-y-12">
        {items.map((example, index) => (
          <ExploreExampleCard
            key={example.id}
            example={example}
            playing={playingIds.has(example.id)}
            eager={index < 2}
            showAdminDelete={isAdmin}
            onOpenPreview={() => goToPreview(index)}
          />
        ))}
      </div>

      {previewExample && previewIndex !== null ? (
        <ExploreExampleLightbox
          example={previewExample}
          index={previewIndex}
          total={items.length}
          hasPrev={previewIndex > 0}
          hasNext={previewIndex < items.length - 1}
          showAdminDelete={isAdmin}
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
