export const BRAND_LOGO_SRC = '/brand/slutbot-logo.webp';

export default function BrandLogo({
  className = 'h-8 w-auto sm:h-9',
}: {
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={BRAND_LOGO_SRC}
      alt="SLUTBOT"
      width={508}
      height={80}
      decoding="async"
      className={`block max-w-none object-contain object-left ${className}`}
    />
  );
}
