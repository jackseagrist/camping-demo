import { NextResponse } from 'next/server'

export function middleware(req) {
  const basicAuth = req.headers.get('authorization')

  if (basicAuth) {
    const [user, pass] = atob(basicAuth.split(' ')[1] || '').split(':')
    if (user === 'tester' && pass === 'letmein') {
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
  matcher: ['/plan'], // or ['/:path*'] for full-site protection
}