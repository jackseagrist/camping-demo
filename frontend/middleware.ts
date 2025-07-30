import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Skip redirect checks for auth-related paths to prevent redirect loops during OAuth flows
  const isAuthPath = req.nextUrl.pathname.startsWith('/auth/');
  if (isAuthPath) {
    return res;
  }

  // Only redirect from login page when authenticated
  if (session && req.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return res;
} 