import { createHmac } from 'crypto';
import connectDB from '@/lib/db/mongodb';
import { SlutbotUser } from '@/lib/models';
import { isTrialEligibleCountry } from '@/lib/geo/tier1';
import { requireJwtSecret } from '@/lib/auth/secrets';
import { TRIAL_CREDITS } from '@/lib/trial/config';

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

/** One trial per public IP. Extra accounts from the same IP can sign up, but get no free credits. */
export async function trialGrantFields(country: string, ip = ''): Promise<TrialGrantFields> {
  const signupCountry = (country || '').trim().toUpperCase();
  const signupIpHash = hashSignupIp(ip);

  if (!isTrialEligibleCountry(signupCountry)) {
    return emptyGrant(signupCountry, signupIpHash);
  }

  if (!signupIpHash) {
    return emptyGrant(signupCountry);
  }

  await connectDB();
  const alreadyGranted = await SlutbotUser.exists({ signupIpHash, trialGranted: true });
  if (alreadyGranted) {
    return emptyGrant(signupCountry, signupIpHash);
  }

  return {
    signupCountry,
    trialCredits: TRIAL_CREDITS,
    trialGranted: true,
    trialGrantedAt: new Date(),
    signupIpHash,
  };
}
