import type { Metadata } from 'next';
import ArchiveClient from './ArchiveClient';

export const metadata: Metadata = {
  title: 'My Collection',
  description: 'Your saved SLUTBOT AI generations.',
  robots: { index: false, follow: false },
};

export default function ArchivePage() {
  return <ArchiveClient />;
}
