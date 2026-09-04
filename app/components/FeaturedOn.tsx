import { Archivo_Black } from 'next/font/google';

const erogramxMark = Archivo_Black({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
});

type Publication = {
  name: string;
  href: string;
  logo?: string;
  width?: number;
  height?: number;
};

const FEATURED_PUBLICATIONS: Publication[] = [
  {
    name: 'EROGRAMX',
    href: 'https://erogram.pro/',
  },
  {
    name: 'The New York Times',
    href: 'https://www.nytimes.com/',
    logo: '/featured/nyt.svg',
    width: 185,
    height: 25,
  },
  {
    name: 'New York Post',
    href: 'https://nypost.com/',
  },
  {
    name: 'Mashable',
    href: 'https://mashable.com/',
    logo: '/featured/mashable.svg',
    width: 595,
    height: 95,
  },
  {
    name: 'Lifehacker',
    href: 'https://lifehacker.com/',
    logo: '/featured/lifehacker.svg',
    width: 1497,
    height: 414,
  },
  {
    name: 'Wired',
    href: 'https://www.wired.com/',
    logo: '/featured/wired.svg',
    width: 125,
    height: 25,
  },
];

function PublicationMark({ name }: { name: string }) {
  if (name === 'EROGRAMX') {
    return (
      <span
        className={`${erogramxMark.className} inline-flex items-baseline text-[13px] leading-none tracking-[-0.04em] text-white sm:text-[16px]`}
      >
        <span className="relative z-10">EROGRAM</span>
        <span className="relative z-0 -ml-0.5 text-[1.1em] leading-none tracking-tight">X</span>
      </span>
    );
  }

  if (name === 'New York Post') {
    return (
      <span className="flex flex-col items-center justify-center text-white">
        <span className="text-[7px] font-semibold tracking-[0.32em] sm:text-[8px] sm:tracking-[0.36em]">NEW YORK</span>
        <span className="mt-px text-[12px] font-black leading-none tracking-[0.18em] sm:text-[15px] sm:tracking-[0.2em]">
          POST
        </span>
      </span>
    );
  }

  return null;
}

type FeaturedOnProps = {
  variant?: 'default' | 'login' | 'login-content' | 'menu';
};

export default function FeaturedOn({ variant = 'default' }: FeaturedOnProps) {
  const isLogin = variant === 'login' || variant === 'login-content';
  const isMenu = variant === 'menu';
  const isEmbedded = variant === 'login-content' || isMenu;

  const content = (
    <>
      <p
        className={
          isMenu
            ? 'text-center text-[9px] font-semibold uppercase tracking-[0.32em] text-white/45'
            : isLogin
              ? 'text-center text-[10px] font-semibold uppercase tracking-[0.38em] text-[#ff9ec4]/80 drop-shadow-[0_0_10px_rgba(255,45,120,0.35)]'
              : 'text-center text-[10px] font-medium uppercase tracking-[0.32em] text-white/40'
        }
      >
        {isLogin ? 'Featured on' : 'Featured in'}
      </p>
      <ul
        className={`grid items-center justify-items-center ${
          isMenu
            ? 'mt-3 grid-cols-3 gap-x-2 gap-y-3'
            : isLogin
              ? 'mt-5 grid-cols-3 gap-x-4 gap-y-5 sm:mt-6 sm:grid-cols-6 sm:gap-x-6 sm:gap-y-0'
              : 'mt-8 grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 sm:gap-x-8 lg:grid-cols-6 lg:gap-x-5 lg:gap-y-0'
        }`}
      >
        {FEATURED_PUBLICATIONS.map(({ name, href, logo, width, height }) => (
          <li key={name} className="flex w-full items-center justify-center">
            <a
              href={href}
              target="_blank"
              rel="nofollow noopener noreferrer"
              aria-label={`Visit ${name}`}
              className={`flex w-full items-center justify-center transition-all duration-300 ${
                isMenu
                  ? 'h-6 max-w-[84px] opacity-50 hover:opacity-100'
                  : isLogin
                    ? 'h-8 max-w-[108px] opacity-45 hover:opacity-100 hover:drop-shadow-[0_0_14px_rgba(255,45,120,0.45)] sm:h-9 sm:max-w-[120px]'
                    : 'h-9 max-w-[130px] opacity-60 hover:opacity-100'
              }`}
            >
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logo}
                  alt={name}
                  width={width}
                  height={height}
                  loading="lazy"
                  decoding="async"
                  className={
                    isMenu
                      ? 'max-h-3.5 w-auto max-w-[78px] object-contain object-center'
                      : 'max-h-5 w-auto max-w-[112px] object-contain object-center sm:max-h-6'
                  }
                />
              ) : (
                <PublicationMark name={name} />
              )}
            </a>
          </li>
        ))}
      </ul>
    </>
  );

  if (isEmbedded) {
    return content;
  }

  return (
    <section
      aria-label="Featured in major publications"
      className={
        isLogin
          ? 'relative border-t border-[#ff2d78]/25 bg-gradient-to-t from-[#0a0208]/75 via-[#140810]/45 to-transparent backdrop-blur-md'
          : 'border-t border-white/10 bg-[#070707]'
      }
    >
      {isLogin ? (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#ff2d78]/70 to-transparent"
          aria-hidden
        />
      ) : null}
      <div
        className={`safe-x mx-auto max-w-[1280px] ${isLogin ? 'px-4 py-6 sm:py-8 pb-[max(1.25rem,var(--safe-bottom))]' : 'py-10 sm:py-12'}`}
      >
        {content}
      </div>
    </section>
  );
}
