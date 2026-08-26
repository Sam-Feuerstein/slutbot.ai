import { cookies } from 'next/headers';
import { authenticateSlutbotToken, type SlutbotAuthUser } from '@/lib/auth/slutbotAuth';
import { USER_SESSION_COOKIE } from '@/lib/auth/sessionCookie';

export async function userFromSession(): Promise<SlutbotAuthUser | null> {
  const token = (await cookies()).get(USER_SESSION_COOKIE)?.value;
  return authenticateSlutbotToken(token);
}
