import { NextRequest } from 'next/server';
import { POST as telegramCallbackPost } from '@/app/api/auth/telegram/callback/route';

export async function POST(req: NextRequest) {
  return telegramCallbackPost(req);
}
