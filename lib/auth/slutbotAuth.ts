import { randomUUID } from 'crypto';
import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { SlutbotUser } from '@/lib/models';
import { requireJwtSecret } from '@/lib/auth/secrets';
import { sessionTokenFromRequest } from '@/lib/auth/sessionCookie';

export type SlutbotAuthUser = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
  clientId: string;
  desires: number;
  banned: boolean;
};

export function signSlutbotToken(userId: string) {
  return jwt.sign({ id: userId, app: 'slutbot' }, requireJwtSecret(), { expiresIn: '30d' });
}

export function authenticateSlutbotUser(req: NextRequest): Promise<SlutbotAuthUser | null> {
  return authenticateSlutbotToken(sessionTokenFromRequest(req));
}

export async function authenticateSlutbotToken(token?: string | null): Promise<SlutbotAuthUser | null> {
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, requireJwtSecret()) as { id?: string; app?: string };
    if (!decoded.id || decoded.app !== 'slutbot') return null;

    await connectDB();
    const user = (await SlutbotUser.findById(decoded.id).lean()) as {
      _id: unknown;
      email: string;
      name?: string;
      avatarUrl?: string;
      clientId: string;
      desires?: number;
      banned?: boolean;
    } | null;
    if (!user || user.banned) return null;

    return {
      id: String(user._id),
      email: user.email,
      name: user.name || '',
      avatarUrl: user.avatarUrl || '',
      clientId: user.clientId,
      desires: user.desires ?? 0,
      banned: !!user.banned,
    };
  } catch {
    return null;
  }
}

export function newClientId() {
  return randomUUID();
}
