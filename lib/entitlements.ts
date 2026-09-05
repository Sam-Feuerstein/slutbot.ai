import { SlutbotPayment } from '@/lib/models';
import { isAdminAppUserEmail } from '@/lib/auth/adminUser';
import type { AccountTier } from '@/lib/viewAs';

export async function accountTierForUser(input: {
  userId: string;
  email?: string | null;
  desires?: number;
}): Promise<AccountTier> {
  if (isAdminAppUserEmail(input.email)) return 'ultra';

  const ultra = await SlutbotPayment.exists({
    userId: input.userId,
    status: 'paid',
    planId: 'legend',
  });
  if (ultra) return 'ultra';

  if (Math.round(Number(input.desires) || 0) > 0) return 'paid';
  return 'free';
}
