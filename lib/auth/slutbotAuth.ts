import { randomUUID } from 'crypto';
import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/mongodb';
import { SlutbotUser } from '@/lib/models';

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';

export type SlutbotAuthUser = {
  id: string;
  email: string;
  name: string;
  clientId: string;
  desires: number;
  banned: boolean;
};

export function signSlutbotToken(userId: string) {
  return jwt.sign({ id: userId, app: 'slutbot' }, JWT_SECRET, { expiresIn: '30d' });
}

export function authenticateSlutbotUser(req: NextRequest): Promise<SlutbotAuthUser | null> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return Promise.resolve(null);
  return authenticateSlutbotToken(authHeader.slice(7));
}

export async function authenticateSlutbotToken(token?: string | null): Promise<SlutbotAuthUser | null> {
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id?: string; app?: string };
    if (!decoded.id || decoded.app !== 'slutbot') return null;

    await connectDB();
    const user = (await SlutbotUser.findById(decoded.id).lean()) as {
      _id: unknown;
      email: string;
      name?: string;
      clientId: string;
      desires?: number;
      banned?: boolean;
    } | null;
    if (!user || user.banned) return null;

    return {
      id: String(user._id),
      email: user.email,
      name: user.name || '',
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
