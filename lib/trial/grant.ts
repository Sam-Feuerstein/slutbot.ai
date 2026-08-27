import { isTier1Country } from '@/lib/geo/tier1';
import { TRIAL_CREDITS } from '@/lib/trial/config';

export function trialGrantFields(country: string) {
  const signupCountry = (country || '').trim().toUpperCase();
  if (!isTier1Country(signupCountry)) {
    return {
      signupCountry,
      trialCredits: 0,
      trialGranted: false,
      trialGrantedAt: null as Date | null,
    };
  }
  return {
    signupCountry,
    trialCredits: TRIAL_CREDITS,
    trialGranted: true,
    trialGrantedAt: new Date(),
  };
}
