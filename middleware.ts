import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE, verifyAdminToken } from '@/lib/auth/adminSession';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isLoginPage = pathname === '/admin/login';
  const isLoginApi = pathname === '/api/admin/login';
  if (isLoginApi) return NextResponse.next();

  const ok = await verifyAdminToken(req.cookies.get(ADMIN_COOKIE)?.value);

  if (pathname.startsWith('/api/admin')) {
    if (!ok) return NextResponse.json({ message: 'Admin login required.' }, { status: 401 });
    return NextResponse.next();
  }

  if (isLoginPage) {
    if (ok) return NextResponse.redirect(new URL('/admin', req.url));
    return NextResponse.next();
  }

  if (!ok) {
    const login = new URL('/admin/login', req.url);
    login.searchParams.set('next', pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin', '/admin/:path*', '/api/admin/:path*'],
};
