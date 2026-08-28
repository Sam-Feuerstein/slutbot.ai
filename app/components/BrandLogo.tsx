import Image from 'next/image';

export const BRAND_LOGO_SRC = '/brand/aislutbot-logo.png';

export default function BrandLogo({
  className = 'h-9 w-auto max-w-full sm:h-[58px]',
  preload = false,
  priority = false,
}: {
  className?: string;
  preload?: boolean;
  priority?: boolean;
}) {
  return (
    <Image
      src={BRAND_LOGO_SRC}
      alt="AI SLUTBOT"
      width={456}
      height={128}
      preload={preload || priority}
      sizes="(max-width: 640px) 228px, 280px"
      className={`block max-w-full object-contain object-left ${className}`}
      style={{ width: 'auto' }}
    />
  );
}
