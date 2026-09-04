import { sendTemplateEmail, isSendableEmail } from '@/lib/email/send';
import { formatUsdPrice } from '@/lib/premiumPlans';
import { envValue } from '@/lib/env';

export function queuePurchaseEmail(_input: {
  email?: string | null;
  name?: string | null;
  plan: string;
  usdAmount: number;
  desires: number;
}) {
  if (envValue('EMAIL_SEND_TO_USERS') !== 'true') return;

  const email = (_input.email || '').trim().toLowerCase();
  if (!isSendableEmail(email)) return;

  const desires = Math.max(0, Math.round(_input.desires)).toLocaleString('en-US');
  void sendTemplateEmail('purchase', {
    to: email,
    vars: {
      name: _input.name || '',
      email,
      plan: _input.plan,
      amount: formatUsdPrice(_input.usdAmount),
      desires,
      stars: desires,
    },
  }).then((result) => {
    if (!result.ok) console.error('[email] purchase not sent:', result.error);
  }).catch((err) => {
    console.error('[email] purchase failed:', err);
  });
}
