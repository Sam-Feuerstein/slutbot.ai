import connectDB from '@/lib/db/mongodb';
import { SlutbotUser, SlutbotWallet } from '@/lib/models';
import { newClientId, signSlutbotToken } from '@/lib/auth/slutbotAuth';
import { envValue } from '@/lib/env';

/** Display / wallet balance used for the linked admin app user. */
export const ADMIN_INFINITE_DESIRES = 9_999_999;

export function adminAppUserEmail(): string {
  const username = (envValue('ADMIN_USERNAME') || 'admin').trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
  return `${username || 'admin'}@aislutbot.local`;
}

export function isAdminAppUserEmail(email?: string | null): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === adminAppUserEmail();
}

export async function ensureAdminAppUser(): Promise<{
  id: string;
  email: string;
  name: string;
  clientId: string;
  desires: number;
  token: string;
}> {
  await connectDB();
  const email = adminAppUserEmail();
  let user = await SlutbotUser.findOne({ email });

  if (!user) {
    user = await SlutbotUser.create({
      email,
      name: 'Admin',
      clientId: newClientId(),
      desires: ADMIN_INFINITE_DESIRES,
      passwordHash: null,
      banned: false,
    });
  } else {
    user.name = user.name || 'Admin';
    user.desires = ADMIN_INFINITE_DESIRES;
    user.banned = false;
    user.lastLoginAt = new Date();
    await user.save();
  }

  await upsertAdminWallet(user.clientId, user._id, ADMIN_INFINITE_DESIRES);

  return {
    id: String(user._id),
    email: user.email,
    name: user.name || 'Admin',
    clientId: user.clientId,
    desires: ADMIN_INFINITE_DESIRES,
    token: signSlutbotToken(String(user._id)),
  };
}

async function upsertAdminWallet(clientId: string, userId: unknown, desires: number) {
  await SlutbotWallet.findOneAndUpdate(
    { clientId },
    { $set: { desires, userId } },
    { upsert: true, new: true },
  );
}
