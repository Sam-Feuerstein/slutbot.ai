type Publication = {
  name: string;
  href: string;
  logo?: string;
  width?: number;
  height?: number;
};

const FEATURED_PUBLICATIONS: Publication[] = [
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
    name: 'Futurism',
    href: 'https://futurism.com/',
  },
  {
    name: 'Wired',
    href: 'https://www.wired.com/',
    logo: '/featured/wired.svg',
    width: 125,
    height: 25,
  },
  {
    name: 'HuffPost',
    href: 'https://www.huffpost.com/',
  },
];

function PublicationMark({ name }: { name: string }) {
  if (name === 'New York Post') {
    return (
      <span className="flex flex-col items-center justify-center text-white">
        <span className="text-[8px] font-semibold tracking-[0.36em]">NEW YORK</span>
        <span className="mt-px text-[15px] font-black leading-none tracking-[0.2em]">POST</span>
      </span>
    );
  }

  if (name === 'Futurism') {
    return (
      <span className="text-[13px] font-extrabold tracking-[0.28em] text-white">FUTURISM</span>
    );
  }

  if (name === 'HuffPost') {
    return (
      <span className="flex items-center gap-[5px] text-white">
        <span aria-hidden className="h-[14px] w-[7px] border-y-[2.5px] border-l-[2.5px] border-white" />
        <span className="text-[15px] font-extrabold leading-none tracking-tight">HuffPost</span>
        <span aria-hidden className="h-[14px] w-[7px] border-y-[2.5px] border-r-[2.5px] border-white" />
      </span>
    );
  }

  return null;
}

export default function FeaturedOn() {
  return (
    <section aria-label="Featured in major publications" className="border-t border-white/10 bg-[#070707]">
      <div className="safe-x mx-auto max-w-[1280px] py-10 sm:py-12">
        <p className="text-center text-[10px] font-medium uppercase tracking-[0.32em] text-white/40">
          Featured in
        </p>
        <ul className="mt-8 grid grid-cols-2 items-center justify-items-center gap-x-5 gap-y-8 sm:grid-cols-3 sm:gap-x-8 lg:grid-cols-7 lg:gap-x-5 lg:gap-y-0">
          {FEATURED_PUBLICATIONS.map(({ name, href, logo, width, height }) => (
            <li key={name} className="flex w-full items-center justify-center">
              <a
                href={href}
                target="_blank"
                rel="nofollow noopener noreferrer"
                aria-label={`Visit ${name}`}
                className="flex h-9 w-full max-w-[130px] items-center justify-center opacity-60 transition-opacity duration-200 hover:opacity-100"
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
                    className="max-h-5 w-auto max-w-[112px] object-contain object-center sm:max-h-6"
                  />
                ) : (
                  <PublicationMark name={name} />
                )}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
