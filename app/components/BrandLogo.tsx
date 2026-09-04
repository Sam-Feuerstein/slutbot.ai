import { Bebas_Neue } from 'next/font/google';

const brandMark = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
});

type BrandLogoProps = {
  className?: string;
  /** Kept for compatibility with older call sites. */
  preload?: boolean;
  priority?: boolean;
};

export default function BrandLogo({ className = '' }: BrandLogoProps) {
  return (
    <span
      className={`${brandMark.className} inline-flex select-none items-baseline leading-none ${className}`}
      aria-label="AISLUTBOT"
    >
      <span className="inline-flex items-baseline uppercase tracking-[0.04em]">
        <span className="text-white">AI</span>
        <span className="text-[#ff2d78]">SLUT</span>
        <span className="text-white">BOT</span>
      </span>
    </span>
  );
}
