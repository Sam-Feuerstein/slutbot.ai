import type { VideoModel } from '@/lib/imageToVideo/types';
import { getStoredAuthToken } from '@/lib/auth/session';
import { DESIRE_COSTS, getGenerationDesireCost, type VideoQuality } from '@/lib/generation/costs';
import { checkoutHref } from '@/lib/site';

export { DESIRE_COSTS, getGenerationDesireCost };
export type { VideoQuality };

export type VideoQualityTier = 'basic' | 'better' | 'better720' | 'better1080';

const STORAGE_KEY = 'slutbot-desires';
const TRIAL_STORAGE_KEY = 'slutbot-trial-credits';
const USER_CLIENT_KEY = 'slutbot-user-client-id';
export const OPEN_PREMIUM_EVENT = 'slutbot:open-premium';
export const DESIRES_UPDATED_EVENT = 'slutbot:desires-updated';

export const CURRENCY_NAME = 'Stars';
export const CURRENCY_NAME_SINGULAR = 'Star';

export const VIDEO_DURATION_SECONDS = 5;

/** Homepage sample cards: 5s · 480p · standard video price, or one image price for stills. */
export function samplePreviewGeneration(isVideo: boolean) {
  return {
    durationSec: isVideo ? VIDEO_DURATION_SECONDS : null,
    qualityLabel: isVideo ? '480p' : null,
    cost: isVideo ? DESIRE_COSTS.videoBetter : DESIRE_COSTS.image,
  };
}

/** Pack video counts use 480 Normal. Image and video costs are in Stars. */

export const VIDEO_QUALITY_TIERS: {
  id: VideoQualityTier;
  label: string;
  hint: string;
  cost: number;
  videoModel: VideoModel;
  quality: VideoQuality;
}[] = [
  { id: 'basic', label: 'Basic', hint: '5s · faster', cost: DESIRE_COSTS.videoBasic, videoModel: 'cheap', quality: '480p' },
  { id: 'better', label: '480', hint: 'Normal quality', cost: DESIRE_COSTS.videoBetter, videoModel: 'current', quality: '480p' },
  { id: 'better720', label: '720', hint: 'High quality', cost: DESIRE_COSTS.videoBetter720, videoModel: 'current', quality: '720p' },
  { id: 'better1080', label: '1080', hint: 'Ultra high quality', cost: DESIRE_COSTS.videoBetter1080, videoModel: 'current', quality: '1080p' },
];

/** Selectable generator outputs — Basic / cheap model is not offered. */
export const VIDEO_OUTPUT_TIERS = VIDEO_QUALITY_TIERS.filter((row) => row.id !== 'basic');

export function videoTierFromSettings(videoModel: VideoModel, quality: VideoQuality): VideoQualityTier {
  if (videoModel === 'cheap') return 'basic';
  if (quality === '1080p') return 'better1080';
  if (quality === '720p') return 'better720';
  return 'better';
}

export function getDesires(): number {
  if (typeof window === 'undefined') return 0;
  const raw = localStorage.getItem(STORAGE_KEY);
  const parsed = raw ? Number(raw) : 0;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export function setDesires(amount: number) {
  localStorage.setItem(STORAGE_KEY, String(Math.max(0, Math.round(amount))));
  notifyDesiresUpdated();
}

export function addDesires(amount: number) {
  setDesires(getDesires() + amount);
}

export function deductDesires(amount: number): boolean {
  const current = getDesires();
  if (current < amount) return false;
  setDesires(current - amount);
  return true;
}

export function getTrialCredits(): number {
  if (typeof window === 'undefined') return 0;
  const raw = localStorage.getItem(TRIAL_STORAGE_KEY);
  const parsed = raw ? Number(raw) : 0;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export function setTrialCredits(amount: number) {
  localStorage.setItem(TRIAL_STORAGE_KEY, String(Math.max(0, Math.round(amount))));
}

export function getPaidDesires(): number {
  return Math.max(0, getDesires() - getTrialCredits());
}

export function remainingGenerations(amount: number, paidAmount = amount): { images: number; videos: number } {
  const coins = Math.max(0, Math.floor(amount));
  const paid = Math.max(0, Math.floor(paidAmount));
  return {
    images: Math.floor(coins / DESIRE_COSTS.image),
    videos: Math.floor(paid / DESIRE_COSTS.videoBetter),
  };
}

export function remainingGenerationsCopy(amount: number, paidAmount = amount): string {
  const { images, videos } = remainingGenerations(amount, paidAmount);
  const imageWord = images === 1 ? 'image' : 'images';
  const videoWord = videos === 1 ? 'video' : 'videos';
  if (videos <= 0) {
    return `${images.toLocaleString('en-US')} ${imageWord}`;
  }
  if (images <= 0) {
    return `${videos.toLocaleString('en-US')} ${videoWord}`;
  }
  return `${images.toLocaleString('en-US')} ${imageWord} or ${videos.toLocaleString('en-US')} ${videoWord}`;
}

export function formatDesireBalance(amount: number): string {
  return formatSlutcoinBalance(amount);
}

export function formatSlutcoinBalance(amount: number): string {
  if (amount >= 1_000_000) return '∞';
  if (amount >= 10000) return `${Math.round(amount / 1000)}K`;
  if (amount >= 1000) {
    const value = amount / 1000;
    return `${value.toFixed(1).replace(/\.0$/, '')}K`;
  }
  return String(amount);
}

export function openPremiumPlans(reason?: string) {
  if (typeof window === 'undefined') return;
  window.location.assign(checkoutHref({ plan: 'flirt', reason }));
}

export function openCheckoutInsufficient(_needed?: number, _have?: number) {
  openPremiumPlans('low_balance');
}

export function notifyDesiresUpdated() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(DESIRES_UPDATED_EVENT));
}

export function getAuthToken(): string | null {
  return getStoredAuthToken();
}

export function getWalletClientId(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(USER_CLIENT_KEY) || '';
}

export async function refreshDesiresFromServer(_clientIdOverride?: string) {
  if (typeof window === 'undefined') return getDesires();
  if (!getAuthToken()) {
    if (getDesires() !== 0) setDesires(0);
    localStorage.removeItem('slutbot-desires-server');
    localStorage.removeItem(TRIAL_STORAGE_KEY);
    return 0;
  }
  try {
    const res = await fetch('/api/wallet', { credentials: 'include' });
    if (res.status === 401) {
      setDesires(0);
      localStorage.removeItem('slutbot-desires-server');
      localStorage.removeItem(TRIAL_STORAGE_KEY);
      return 0;
    }
    const data = (await res.json()) as {
      desires?: number;
      trialCredits?: number;
      clientId?: string;
    };
    setTrialCredits(0);
    const server = Number(data.desires);
    if (Number.isFinite(server) && server >= 0) {
      setDesires(server);
      localStorage.setItem('slutbot-desires-server', String(server));
    }
    if (data.clientId && !getWalletClientId()) {
      localStorage.setItem(USER_CLIENT_KEY, data.clientId);
    }
  } catch {
    /* keep local */
  }
  return getDesires();
}

export async function syncPurchasedDesires(clientId?: string) {
  return refreshDesiresFromServer(clientId);
}
