import type { VideoModel } from '@/lib/imageToVideo/types';

const STORAGE_KEY = 'slutbot-desires';
const USER_CLIENT_KEY = 'slutbot-user-client-id';
export const OPEN_PREMIUM_EVENT = 'slutbot:open-premium';
export const DESIRES_UPDATED_EVENT = 'slutbot:desires-updated';

export const CURRENCY_NAME = 'Slutcoins';
export const CURRENCY_NAME_SINGULAR = 'Slutcoin';

export const VIDEO_DURATION_SECONDS = 5;

/** Pack video counts use 480 Normal (8 Slutcoins). Image is 4 Slutcoins. */
export const DESIRE_COSTS = {
  image: 4,
  videoBasic: 8,
  videoBetter: 8,
  videoBetter720: 12,
  videoBetter1080: 16,
} as const;

export type VideoQualityTier = 'basic' | 'better' | 'better720' | 'better1080';
export type VideoQuality = '480p' | '720p' | '1080p';

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

export function hasEnoughDesires(amount: number): boolean {
  return getDesires() >= amount;
}

export function getGenerationDesireCost(
  mode: 'image' | 'video',
  videoModel: VideoModel = 'current',
  quality: VideoQuality = '480p',
): number {
  if (mode === 'image') return DESIRE_COSTS.image;
  const tier = VIDEO_QUALITY_TIERS.find((row) => row.id === videoTierFromSettings(videoModel, quality));
  return tier?.cost ?? DESIRE_COSTS.videoBetter;
}

export function formatDesireBalance(amount: number): string {
  return formatSlutcoinBalance(amount);
}

export function formatSlutcoinBalance(amount: number): string {
  if (amount >= 10000) return `${Math.round(amount / 1000)}K`;
  if (amount >= 1000) {
    const value = amount / 1000;
    return `${value.toFixed(1).replace(/\.0$/, '')}K`;
  }
  return String(amount);
}

export function openPremiumPlans() {
  if (typeof window === 'undefined') return;
  window.location.assign('/checkout?plan=flirt');
}

export function notifyDesiresUpdated() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(DESIRES_UPDATED_EVENT));
}

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

export function getWalletClientId(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(USER_CLIENT_KEY) || '';
}

export async function refreshDesiresFromServer() {
  if (typeof window === 'undefined') return getDesires();
  const token = getAuthToken();
  try {
    const headers: HeadersInit = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const clientId = getWalletClientId();
    const url = clientId
      ? `/api/wallet?clientId=${encodeURIComponent(clientId)}`
      : '/api/wallet';
    const res = await fetch(url, { headers });
    const data = (await res.json()) as { desires?: number; clientId?: string };
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

export async function syncPurchasedDesires(_clientId?: string) {
  return refreshDesiresFromServer();
}

export async function spendDesiresServer(amount: number, mode: 'image' | 'video'): Promise<boolean> {
  const token = getAuthToken();
  if (!token) return false;
  try {
    const res = await fetch('/api/wallet/spend', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ amount, mode }),
    });
    const data = (await res.json()) as { desires?: number };
    if (!res.ok) return false;
    if (typeof data.desires === 'number') setDesires(data.desires);
    return true;
  } catch {
    return false;
  }
}
