import type { Metadata } from 'next';
import HomeClient from './HomeClient';
import HomeSeoSection from './components/HomeSeoSection';
import JsonLd from './components/JsonLd';
import { buildPageMetadata, softwareApplicationJsonLd } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'AI Nude image and video Generator | SLUTBOT.AI',
  description:
    'Experience SLUTBOT AI the cutting edge of AI nude video and image generation. Bring your AI SLUT BOT to life in just a few clicks.',
  path: '/',
  ogTitle: 'AI Nude image and video Generator | SLUTBOT.AI',
});

export default function HomePage() {
  return (
    <>
      <JsonLd data={softwareApplicationJsonLd()} />
      <HomeClient />
      <HomeSeoSection />
    </>
  );
}
