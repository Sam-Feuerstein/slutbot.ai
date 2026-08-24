import Image, { type ImageProps } from 'next/image';

type Props = Omit<ImageProps, 'src' | 'alt'> & {
  src?: string | null;
  alt?: string;
};

export default function MediaImage({ src, alt = '', unoptimized, ...props }: Props) {
  if (!src) return null;
  const skipOptimize = unoptimized || src.startsWith('data:') || src.startsWith('blob:');
  return <Image src={src} alt={alt} {...props} unoptimized={skipOptimize} />;
}
