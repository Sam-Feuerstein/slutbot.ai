import Image from 'next/image';

export const BRAND_LOGO_SRC = '/brand/aislutbot-logo.webp';

export default function BrandLogo({
  className = 'h-[51px] w-auto sm:h-[58px]',
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={BRAND_LOGO_SRC}
      alt="AI SLUTBOT"
      width={456}
      height={128}
      priority={priority}
      className={`block max-w-none object-contain object-left ${className}`}
    />
  );
}
