import connectDB from '@/lib/db/mongodb';
import { PlatformSettings } from '@/lib/models';
import { envValue } from '@/lib/env';

type AlertSettingsDoc = { adminTelegramChatId?: string };

/**
 * Chat ID that receives Telegram sale DMs.
 * DB value (set from the admin panel) wins; falls back to the env var.
 */
export async function getAdminTelegramChatId(): Promise<string> {
  await connectDB();
  const doc = (await PlatformSettings.findOne({ key: 'platform' })
    .select('adminTelegramChatId')
    .lean()) as AlertSettingsDoc | null;
  const fromDb = (doc?.adminTelegramChatId || '').trim();
  if (fromDb) return fromDb;
  return (envValue('ADMIN_TELEGRAM_CHAT_ID') || '').trim();
}

export async function setAdminTelegramChatId(chatId: string): Promise<string> {
  const value = (chatId || '').trim();
  await connectDB();
  await PlatformSettings.findOneAndUpdate(
    { key: 'platform' },
    { $set: { adminTelegramChatId: value } },
    { upsert: true, new: true },
  );
  return value;
}
