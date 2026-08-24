import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ImageToVideoClient from '@/app/tool/ImageToVideoClient';
import { getHomePresetById, getHomePresetIds } from '@/lib/homePresets';
import { getPresetMetaDescription, getPresetMetaTitle } from '@/lib/presetSeo';
import { buildPageMetadata } from '@/lib/seo';
import { generatorPresetPath } from '@/lib/site';

type Props = { params: Promise<{ preset: string }> };

export async function generateStaticParams() {
  return getHomePresetIds().map((preset) => ({ preset }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { preset: presetId } = await params;
  const preset = getHomePresetById(presetId);
  if (!preset) return {};

  const title = getPresetMetaTitle(preset);
  const description = getPresetMetaDescription(preset);

  return buildPageMetadata({
    title,
    description,
    path: generatorPresetPath(presetId),
    ogTitle: `${title} | SLUTBOT AI`,
  });
}

export default async function AiPornGeneratorPresetPage({ params }: Props) {
  const { preset: presetId } = await params;
  const preset = getHomePresetById(presetId);
  if (!preset) notFound();

  return <ImageToVideoClient presetId={preset.id} presetTitle={preset.title} />;
}
