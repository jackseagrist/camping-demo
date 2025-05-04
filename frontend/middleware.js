/* commenting out, May 4 2025, we have supabase user auth now

import { NextResponse } from 'next/server'

export function middleware(req) {
  const basicAuth = req.headers.get('authorization')

  if (basicAuth) {
    const [user, pass] = atob(basicAuth.split(' ')[1] || '').split(':')
    if (user === 'climbcovers' && pass === '$h2kf084;sj9fj..') {
      return NextResponse.next()
    }
  }

  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Secure Area"',
    },
  })
}

export const config = {
  matcher: ['/:path*'], // applies to ALL routes
}

*/