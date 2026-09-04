import { NextRequest } from 'next/server';
import { completeOAuthSession } from '@/lib/auth/completeOAuthSession';

export async function GET(req: NextRequest) {
  return completeOAuthSession(req);
}
