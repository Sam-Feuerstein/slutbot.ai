import connectDB from '@/lib/db/mongodb';
import { SlutbotUser } from '@/lib/models';
import { ADMIN_INFINITE_DESIRES, isAdminAppUserEmail } from '@/lib/auth/adminUser';
import { getGenerationDesireCost, type VideoQuality } from '@/lib/generation/costs';
import { isTrialEligibleCountry } from '@/lib/geo/tier1';
import type { VideoModel } from '@/lib/imageToVideo/types';
import type { CreditSource } from '@/lib/users/wallet';

export type GenerationChargePlan = {
  cost: number;
  quality: VideoQuality;
  videoModel: VideoModel;
  paidWith: CreditSource;
  lockVideo: boolean;
  spendable: number;
  error?: 'not_enough';
};

function canSpendTrial(signupCountry: string, currentCountry: string, trialCredits: number): boolean {
  return (
    trialCredits > 0 &&
    isTrialEligibleCountry(signupCountry) &&
    isTrialEligibleCountry(currentCountry)
  );
}

export async function planGenerationCharge(input: {
  userId: string;
  email: string;
  mode: 'image' | 'video';
  videoModel: VideoModel;
  quality: VideoQuality;
  currentCountry: string;
}): Promise<GenerationChargePlan> {
  const quality = input.quality;
  const videoModel = input.videoModel;
  const requestedCost = getGenerationDesireCost(input.mode, videoModel, quality);

  if (isAdminAppUserEmail(input.email)) {
    return {
      cost: 0,
      quality,
      videoModel,
      paidWith: 'admin',
      lockVideo: false,
      spendable: ADMIN_INFINITE_DESIRES,
    };
  }

  await connectDB();
  const user = (await SlutbotUser.findById(input.userId)
    .select('desires trialCredits signupCountry banned')
    .lean()) as {
    desires?: number;
    trialCredits?: number;
    signupCountry?: string;
    banned?: boolean;
  } | null;

  if (!user || user.banned) {
    return {
      cost: requestedCost,
      quality,
      videoModel,
      paidWith: 'paid',
      lockVideo: false,
      spendable: 0,
      error: 'not_enough',
    };
  }

  const paid = Math.max(0, Math.round(user.desires ?? 0));
  const trial = Math.max(0, Math.round(user.trialCredits ?? 0));
  const spendable = paid + trial;
  const trialOk = canSpendTrial(user.signupCountry || '', input.currentCountry, trial);

  if (paid >= requestedCost) {
    return {
      cost: requestedCost,
      quality,
      videoModel,
      paidWith: 'paid',
      lockVideo: false,
      spendable,
    };
  }

  if (trialOk && trial >= requestedCost) {
    return {
      cost: requestedCost,
      quality,
      videoModel,
      paidWith: 'trial',
      lockVideo: false,
      spendable,
    };
  }

  return {
    cost: requestedCost,
    quality,
    videoModel,
    paidWith: 'paid',
    lockVideo: false,
    spendable,
    error: 'not_enough',
  };
}
