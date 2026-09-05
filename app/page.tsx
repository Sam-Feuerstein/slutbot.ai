import type { Metadata } from 'next';
import HomeClient from './HomeClient';
import HomeSeoSection from './components/HomeSeoSection';
import JsonLd from './components/JsonLd';
import { buildPageMetadata, softwareApplicationJsonLd } from '@/lib/seo';
import { exampleMediaUrl } from '@/lib/presetMedia';

// Cache the rendered homepage and refresh it at most every 5 minutes. Admin
// sample edits call revalidatePath('/') for an instant update, so this only
// affects anonymous traffic — it stops 3 Mongo queries + a function invocation
// on every single visit/bot hit.
export const revalidate = 300;

export const metadata: Metadata = buildPageMetadata({
  title: 'AI Nude image and video Generator | AI SLUTBOT',
  description:
    'Experience AI SLUTBOT the cutting edge of AI nude video and image generation. Bring your AI SLUT BOT to life in just a few clicks.',
  path: '/',
  ogTitle: 'AI Nude image and video Generator | AI SLUTBOT',
});

export default function HomePage() {
  return (
    <>
      <link rel="preload" as="image" href={exampleMediaUrl('/examples/example-ex-1.jpg')} />
      <JsonLd data={softwareApplicationJsonLd()} />
      <HomeClient />
      <HomeSeoSection />
    </>
  );
}
