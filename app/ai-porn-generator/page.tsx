import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import ImageToVideoClient from '@/app/tool/ImageToVideoClient';
import JsonLd from '@/app/components/JsonLd';
import { buildPageMetadata, softwareApplicationJsonLd } from '@/lib/seo';
import { GENERATOR_PATH, generatorPresetPath } from '@/lib/site';

export const metadata: Metadata = buildPageMetadata({
  title: 'AI Nude Generator Online',
  description:
    'Use the AI SLUTBOT nude generator to create uncensored AI slut images and 5-second videos. Upload a photo, pick a preset, pay with Slutcoins. 18+ only.',
  path: GENERATOR_PATH,
  ogTitle: 'AI Nude Generator Online | AI SLUTBOT',
});

export default async function AiPornGeneratorPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string }>;
}) {
  const { preset } = await searchParams;
  if (preset) {
    redirect(generatorPresetPath(preset));
  }

  return (
    <>
      <JsonLd data={softwareApplicationJsonLd()} />
      <h1 className="sr-only">AI porn generator</h1>
      <ImageToVideoClient />
    </>
  );
}
