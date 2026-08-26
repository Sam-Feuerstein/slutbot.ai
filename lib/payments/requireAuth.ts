import { NextRequest, NextResponse } from 'next/server';
import { authenticateSlutbotUser } from '@/lib/auth/slutbotAuth';

export function requireSlutbotUser(req: NextRequest) {
  return authenticateSlutbotUser(req).then((user) => {
    if (user) return user;
    return null;
  });
}

export function paymentAuthRequiredResponse() {
  return NextResponse.json({ message: 'Sign in required to purchase.' }, { status: 401 });
}
