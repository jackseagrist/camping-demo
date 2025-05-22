import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // If user is signed in and the current path is / or /login, redirect to /dashboard
  if (session && (req.nextUrl.pathname === '/' || req.nextUrl.pathname === '/login')) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return res;
} 