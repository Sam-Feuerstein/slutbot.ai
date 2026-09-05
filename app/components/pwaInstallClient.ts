'use client';

import { getImageToVideoClientId } from '@/app/tool/clientId';

const RECORDED_KEY = 'pwa_install_recorded';

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

type Listener = () => void;

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let listening = false;
const listeners = new Set<Listener>();

function emit() {
  for (const listener of listeners) listener();
}

export function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream;
}

export function isMobileUa(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

export function getDeferredPwaPrompt() {
  return deferredPrompt;
}

export function clearDeferredPwaPrompt() {
  deferredPrompt = null;
  emit();
}

export function ensurePwaInstallListener() {
  if (listening || typeof window === 'undefined') return;
  listening = true;
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    emit();
  });
}

export function subscribePwaPrompt(listener: Listener) {
  ensurePwaInstallListener();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function recordPwaInstallClient() {
  try {
    const clientId = getImageToVideoClientId();
    if (!clientId) return;
    const recorded = localStorage.getItem(RECORDED_KEY) === '1';
    const signedIn = localStorage.getItem('slutbot-signed-in') === '1';
    const linked = localStorage.getItem('pwa_install_user_linked') === '1';
    if (recorded && (!signedIn || linked)) return;
    void fetch('/api/pwa/install', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId }),
    })
      .then((res) => {
        if (!res.ok) return;
        localStorage.setItem(RECORDED_KEY, '1');
        if (signedIn) localStorage.setItem('pwa_install_user_linked', '1');
      })
      .catch(() => {});
  } catch {
    /* ignore */
  }
}

export async function promptPwaInstall(): Promise<'accepted' | 'dismissed' | 'ios-help' | 'unavailable'> {
  const prompt = deferredPrompt;
  if (prompt) {
    await prompt.prompt();
    const choice = await prompt.userChoice;
    clearDeferredPwaPrompt();
    if (choice.outcome === 'accepted') recordPwaInstallClient();
    return choice.outcome;
  }
  if (isIosDevice()) return 'ios-help';
  return 'unavailable';
}
