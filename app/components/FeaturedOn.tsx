import { Archivo_Black, UnifrakturCook } from 'next/font/google';

const erogramxMark = Archivo_Black({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
});

const nypostGothic = UnifrakturCook({
  weight: '700',
  subsets: ['latin'],
  display: 'swap',
});

type Publication = {
  name: string;
  logo?: string;
  width?: number;
  height?: number;
};

const FEATURED_PUBLICATIONS: Publication[] = [
  { name: 'EROGRAMX' },
  { name: 'Mashable' },
  { name: 'DTOWN Magazine' },
  { name: 'New York Post' },
];

function PublicationMark({ name }: { name: string }) {
  if (name === 'EROGRAMX') {
    return (
      <span
        className={`${erogramxMark.className} inline-flex items-baseline text-[17px] leading-none tracking-[-0.04em] text-white sm:text-[21px]`}
      >
        <span className="relative z-10">EROGRAM</span>
        <span className="relative z-0 -ml-0.5 text-[1.1em] leading-none tracking-tight">X</span>
      </span>
    );
  }

  if (name === 'Mashable') {
    return (
      <span className="text-[17px] font-black italic leading-none tracking-[-0.03em] text-white sm:text-[21px]">
        mashable
      </span>
    );
  }

  if (name === 'New York Post') {
    return (
      <span className="flex flex-col items-center justify-center text-white">
        <span className="font-serif text-[6.5px] font-bold uppercase leading-none tracking-[0.46em] text-white sm:text-[7.5px] sm:tracking-[0.5em]">
          New York
        </span>
        <span className="mt-1 h-px w-[4.6em] bg-white/80" aria-hidden />
        <span className={`${nypostGothic.className} -mt-0.5 text-[26px] leading-none sm:text-[30px]`}>
          Post
        </span>
      </span>
    );
  }

  if (name === 'DTOWN Magazine') {
    return (
      <span className="flex flex-col items-center justify-center text-white">
        <span className="text-[17px] font-black leading-none tracking-[0.14em] sm:text-[21px] sm:tracking-[0.16em]">
          DTOWN
        </span>
        <span className="mt-0.5 text-[8px] font-semibold uppercase tracking-[0.28em] text-white/80 sm:text-[10px] sm:tracking-[0.32em]">
          Magazine
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
        className={`flex flex-wrap items-center justify-center ${
          isMenu
            ? 'mt-1.5 gap-x-5 gap-y-2'
            : isLogin
              ? 'mt-5 gap-x-8 sm:mt-6 sm:gap-x-12'
              : 'mt-8 gap-x-10 sm:gap-x-14'
        }`}
      >
        {FEATURED_PUBLICATIONS.map(({ name, logo, width, height }) => (
          <li key={name} className="flex min-w-0 items-center justify-center">
            <span
              className={`flex cursor-default items-center justify-center ${
                isMenu
                  ? 'min-h-8 opacity-70'
                  : isLogin
                    ? 'min-h-11 opacity-80 sm:min-h-12'
                    : 'min-h-12 opacity-80 sm:min-h-14'
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
                      ? 'max-h-5 w-auto max-w-[100px] object-contain object-center'
                      : 'max-h-7 w-auto max-w-[150px] object-contain object-center sm:max-h-8'
                  }
                />
              ) : (
                <PublicationMark name={name} />
              )}
            </span>
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
