import type { Metadata } from 'next';
import ContentRemovalClient from './ContentRemovalClient';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Content Removal & Complaints',
  description:
    'Submit a content removal or complaint to AI SLUTBOT. Reports reviewed within 5 business days. For urgent legal or safety issues, email legal@aislutbot.com.',
  path: '/content-removal',
});

export default function ContentRemovalPage() {
  return <ContentRemovalClient />;
}
