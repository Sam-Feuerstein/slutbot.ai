import { NextRequest, NextResponse } from 'next/server';
import { ensureAdminAppUser } from '@/lib/auth/adminUser';
import { adminSessionOk } from '@/lib/auth/adminSession';
import { setSessionCookie } from '@/lib/auth/sessionCookie';

/** Returns (or creates) the linked app user session for a logged-in admin. */
export async function GET(req: NextRequest) {
  if (!(await adminSessionOk(req))) {
    return NextResponse.json({ message: 'Admin login required.' }, { status: 401 });
  }

  try {
    const user = await ensureAdminAppUser();
    const res = NextResponse.json({
      ok: true,
      isAdmin: true,
      clientId: user.clientId,
      email: user.email,
      name: user.name,
      desires: user.desires,
    });
    setSessionCookie(res, user.token);
    return res;
  } catch (err) {
    console.error('Admin bootstrap-user error:', err);
    return NextResponse.json({ message: 'Could not create admin app session.' }, { status: 500 });
  }
}
