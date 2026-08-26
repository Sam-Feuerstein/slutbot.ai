import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import JsonLd from '@/app/components/JsonLd';
import SeoLandingPage from '@/app/components/SeoLandingPage';
import { getSeoLandingPage, getSeoLandingSlugs } from '@/lib/seoLandingPages';
import { buildPageMetadata, faqJsonLd } from '@/lib/seo';

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return getSeoLandingSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = getSeoLandingPage(slug);
  if (!page) return {};

  return buildPageMetadata({
    title: page.title,
    description: page.metaDescription,
    path: `/${page.slug}`,
    ogTitle: `${page.title} | AI SLUTBOT`,
  });
}

export default async function SeoLandingRoute({ params }: Props) {
  const { slug } = await params;
  const page = getSeoLandingPage(slug);
  if (!page) notFound();

  return (
    <>
      <JsonLd data={faqJsonLd(page.faq)} />
      <SeoLandingPage page={page} />
    </>
  );
}
