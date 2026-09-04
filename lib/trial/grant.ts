import { createHmac } from 'crypto';
import { requireJwtSecret } from '@/lib/auth/secrets';

export type TrialGrantFields = {
  signupCountry: string;
  trialCredits: number;
  trialGranted: boolean;
  trialGrantedAt: Date | null;
  signupIpHash: string;
};

function isPublicIp(ip: string): boolean {
  const value = ip.trim().toLowerCase();
  if (!value || value === 'local' || value === 'unknown' || value === 'xx') return false;
  if (value === '::1' || value === '0.0.0.0' || value === 'localhost') return false;
  if (value.startsWith('127.') || value.startsWith('10.') || value.startsWith('192.168.')) return false;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(value)) return false;
  if (value.startsWith('fe80:') || value.startsWith('fc') || value.startsWith('fd')) return false;
  return true;
}

export function hashSignupIp(ip: string): string {
  const normalized = ip.trim().toLowerCase();
  if (!isPublicIp(normalized)) return '';
  return createHmac('sha256', requireJwtSecret()).update(`signup-ip:${normalized}`).digest('hex');
}

function emptyGrant(signupCountry: string, signupIpHash = ''): TrialGrantFields {
  return {
    signupCountry,
    trialCredits: 0,
    trialGranted: false,
    trialGrantedAt: null,
    signupIpHash,
  };
}

/** New accounts never receive trial Stars. Generation requires a paid balance. */
export async function trialGrantFields(country: string, ip = ''): Promise<TrialGrantFields> {
  const signupCountry = (country || '').trim().toUpperCase();
  const signupIpHash = hashSignupIp(ip);
  return emptyGrant(signupCountry, signupIpHash);
}
