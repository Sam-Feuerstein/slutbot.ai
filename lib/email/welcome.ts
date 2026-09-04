import connectDB from '@/lib/db/mongodb';
import { SlutbotUser } from '@/lib/models';
import { isSendableEmail, sendTemplateEmail } from '@/lib/email/send';
import { envValue } from '@/lib/env';

type WelcomeUser = {
  _id?: unknown;
  email?: string | null;
  name?: string | null;
  welcomeEmailSentAt?: Date | null;
};

function usersMayReceiveEmail() {
  return envValue('EMAIL_SEND_TO_USERS') === 'true';
}

export async function sendWelcomeEmail(user: WelcomeUser): Promise<void> {
  if (!usersMayReceiveEmail()) return;

  const email = (user.email || '').trim().toLowerCase();
  if (!isSendableEmail(email) || user.welcomeEmailSentAt) return;

  const result = await sendTemplateEmail('welcome', {
    to: email,
    vars: { name: user.name || '', email },
  });
  if (!result.ok) {
    console.error('[email] welcome not sent:', result.error);
    return;
  }

  if (user._id) {
    await connectDB();
    await SlutbotUser.updateOne(
      {
        _id: user._id,
        $or: [{ welcomeEmailSentAt: null }, { welcomeEmailSentAt: { $exists: false } }],
      },
      { $set: { welcomeEmailSentAt: new Date() } },
    );
  }
}

export function queueWelcomeEmail(_user: WelcomeUser) {
  // User mail is off. Do not queue welcome messages.
}
