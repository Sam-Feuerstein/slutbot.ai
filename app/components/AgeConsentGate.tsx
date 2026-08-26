'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Check } from 'lucide-react';
import BrandLogo from './BrandLogo';

const STORAGE_KEY = 'slutbot-age-consent-v1';

const BULLETS = [
  'This website contains age-restricted materials including nudity and explicit depictions of sexual activity.',
  'Using photos of people below the legal age or without their consent is strictly prohibited.',
  'You are solely responsible for the images you generate.',
  'By clicking "Accept" you affirm to the terms above as well as that you are at least the age of majority in the jurisdiction you are accessing the website from and you consent to viewing sexually explicit content.',
];

export default function AgeConsentGate() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (pathname.startsWith('/admin') || pathname.startsWith('/checkout')) return;
    try {
      const accepted = localStorage.getItem(STORAGE_KEY) === '1';
      setVisible(!accepted);
    } catch {
      setVisible(true);
    }
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = visible ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="age-consent-title"
        className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0a0a0a] px-6 py-8 shadow-2xl sm:px-8"
      >
        <div className="flex justify-center">
          <BrandLogo className="h-[58px] w-auto sm:h-16" />
        </div>

        <h2
          id="age-consent-title"
          className="mt-8 text-center text-lg font-black uppercase leading-snug tracking-tight text-white sm:text-xl"
        >
          You must be 18 or the legal age in your country.
        </h2>

        <ul className="mt-6 space-y-3 text-sm leading-relaxed text-white/75">
          {BULLETS.map((item) => (
            <li key={item} className="flex gap-2">
              <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-white/50" />
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <div className="mt-8 flex justify-center">
          <a
            href="https://www.rtalabel.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/rta-label.jpg"
              alt="RTA — Restricted to Adults"
              width={120}
              height={48}
              className="h-10 w-auto bg-white"
            />
          </a>
        </div>

        <button
          type="button"
          onClick={() => {
            localStorage.setItem(STORAGE_KEY, '1');
            setVisible(false);
            window.dispatchEvent(new Event('slutbot-age-consent'));
          }}
          className="mt-8 flex w-full items-center overflow-hidden rounded-2xl bg-[#ff2d78] text-left font-bold text-black shadow-[0_0_28px_rgba(255,45,120,0.45)] transition-colors hover:bg-[#ff1a6b]"
        >
          <span className="flex h-14 w-14 shrink-0 items-center justify-center bg-black/15">
            <Check className="h-5 w-5" strokeWidth={3} />
          </span>
          <span className="flex flex-1 items-center justify-center pr-14 text-base uppercase tracking-wide">
            Accept
          </span>
        </button>
      </div>
    </div>
  );
}
