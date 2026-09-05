'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AGE_CONSENT_EVENT, hasAgeConsent } from '@/lib/ageConsent';
import {
  ensurePwaInstallListener,
  getDeferredPwaPrompt,
  isIosDevice,
  isMobileUa,
  isStandaloneDisplay,
  promptPwaInstall,
  recordPwaInstallClient,
  subscribePwaPrompt,
} from './pwaInstallClient';

const DISMISS_KEY = 'pwa_install_dismissed';
const DISMISS_DAYS = 14;
const SW_URL = '/sw.js?v=3';
const ICON_SRC = '/icons/icon-192.png?v=3';

function wasDismissedRecently(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const until = Number(raw);
    if (!Number.isFinite(until)) return true;
    return Date.now() < until;
  } catch {
    return false;
  }
}

export default function PwaInstallBanner() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIosTip, setShowIosTip] = useState(false);
  const [consentReady, setConsentReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (hasAgeConsent()) {
      setConsentReady(true);
      return;
    }
    const onConsent = () => setConsentReady(true);
    window.addEventListener(AGE_CONSENT_EVENT, onConsent);
    return () => window.removeEventListener(AGE_CONSENT_EVENT, onConsent);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register(SW_URL).catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    ensurePwaInstallListener();
    if (isStandaloneDisplay()) {
      recordPwaInstallClient();
      return;
    }

    const onInstalled = () => {
      recordPwaInstallClient();
      setVisible(false);
    };
    window.addEventListener('appinstalled', onInstalled);
    return () => window.removeEventListener('appinstalled', onInstalled);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!consentReady) return;
    if (pathname.startsWith('/admin')) return;
    if (isStandaloneDisplay()) return;

    if (!isMobileUa() || wasDismissedRecently()) {
      return;
    }

    setIsIOS(isIosDevice());
    const unsubscribe = subscribePwaPrompt(() => {
      if (getDeferredPwaPrompt()) setVisible(true);
    });

    let iosTimer: ReturnType<typeof setTimeout> | undefined;
    if (isIosDevice()) {
      iosTimer = setTimeout(() => setVisible(true), 2500);
    }

    return () => {
      unsubscribe();
      if (iosTimer) clearTimeout(iosTimer);
    };
  }, [consentReady, pathname]);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_DAYS * 86400000));
    } catch {}
    setVisible(false);
    setShowIosTip(false);
  }, []);

  const install = useCallback(async () => {
    const outcome = await promptPwaInstall();
    if (outcome === 'accepted') {
      setVisible(false);
      return;
    }
    if (outcome === 'ios-help' || (outcome === 'unavailable' && isIOS)) {
      setShowIosTip(true);
      return;
    }
    if (outcome === 'dismissed') dismiss();
  }, [dismiss, isIOS]);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Install AI SLUTBOT"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[9998] pb-[var(--safe-bottom)]"
    >
      <div className="pointer-events-auto mx-auto max-w-lg px-3 pb-3">
        <div className="rounded-2xl border border-black/10 bg-white px-4 py-3.5 shadow-2xl">
          {showIosTip ? (
            <div className="space-y-3">
              <p className="text-[13px] leading-relaxed text-[#333]">
                Tap the Share button (box with arrow) at the bottom of Safari, then tap &quot;Add to Home Screen&quot;.
              </p>
              <button
                type="button"
                onClick={dismiss}
                className="w-full rounded-xl bg-[#ff2d78] py-2.5 text-sm font-semibold text-white transition-colors active:bg-[#ff1a6b]"
              >
                Got it
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ICON_SRC}
                alt=""
                width={44}
                height={44}
                className="shrink-0 rounded-xl"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-tight text-[#111]">AI SLUTBOT</p>
                <p className="mt-0.5 text-[12px] text-[#666]">Download App</p>
              </div>
              <button
                type="button"
                onClick={install}
                className="shrink-0 rounded-xl bg-[#ff2d78] px-4 py-2 text-sm font-semibold text-white transition-colors active:bg-[#ff1a6b]"
              >
                Install
              </button>
              <button
                type="button"
                onClick={dismiss}
                aria-label="Dismiss"
                className="flex h-8 w-8 shrink-0 items-center justify-center text-[#999] active:text-[#111]"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
