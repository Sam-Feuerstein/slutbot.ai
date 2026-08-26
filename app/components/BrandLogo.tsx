export const BRAND_LOGO_SRC = '/brand/aislutbot-logo.webp?v=1';

export default function BrandLogo({
  className = 'h-[51px] w-auto sm:h-[58px]',
}: {
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={BRAND_LOGO_SRC}
      alt="AI SLUTBOT"
      width={456}
      height={128}
      decoding="async"
      className={`block max-w-none object-contain object-left ${className}`}
    />
  );
}
