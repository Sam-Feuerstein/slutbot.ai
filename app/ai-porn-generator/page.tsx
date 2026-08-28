import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import ImageToVideoClient from '@/app/tool/ImageToVideoClient';
import JsonLd from '@/app/components/JsonLd';
import { getExampleById, type ExampleVideo } from '@/lib/exampleVideos';
import { listPublicExamples } from '@/lib/samples';
import { buildPageMetadata, softwareApplicationJsonLd } from '@/lib/seo';
import { GENERATOR_PATH, generatorPresetPath } from '@/lib/site';

export const metadata: Metadata = buildPageMetadata({
  title: 'AI Nude Generator Online',
  description:
    'Use the AI SLUTBOT nude generator to create uncensored AI slut images and 5-second videos. Upload a photo, pick a preset, pay with Stars. 18+ only.',
  path: GENERATOR_PATH,
  ogTitle: 'AI Nude Generator Online | AI SLUTBOT',
});

export const maxDuration = 60;

async function resolveDemoSample(sampleId?: string): Promise<ExampleVideo | undefined> {
  const id = sampleId?.trim();
  if (!id) return undefined;
  const fromStatic = getExampleById(id);
  if (fromStatic) return fromStatic;
  try {
    const rows = await listPublicExamples();
    const row = rows.find((item) => item.id === id);
    if (!row) return undefined;
    return {
      id: row.id,
      title: row.title,
      poster: row.poster,
      video: row.video,
      source: row.source,
    };
  } catch {
    return undefined;
  }
}

export default async function AiPornGeneratorPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; mode?: string; sample?: string }>;
}) {
  const { preset, mode, sample } = await searchParams;
  if (preset) {
    redirect(generatorPresetPath(preset));
  }

  const initialMode = mode === 'image' || mode === 'video' ? mode : undefined;
  const demoSample = await resolveDemoSample(sample);

  return (
    <>
      <JsonLd data={softwareApplicationJsonLd()} />
      <h1 className="sr-only">AI porn generator</h1>
      <ImageToVideoClient initialMode={initialMode} demoSample={demoSample} />
    </>
  );
}
