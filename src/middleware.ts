import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const host = request.headers.get('host');

  // Redirect /schedule to /schedule/ on any host to ensure relative assets load correctly
  if (url.pathname === '/schedule') {
    url.pathname = '/schedule/';
    return NextResponse.redirect(url);
  }

  // If host is schedule.mcjp.io, rewrite requests to /schedule
  if (host === 'schedule.mcjp.io') {
    // If it's looking for root, serve index.html directly
    if (url.pathname === '/') {
      url.pathname = '/schedule/index.html';
      return NextResponse.rewrite(url);
    }
    
    // Otherwise, rewrite to public/schedule directory
    if (!url.pathname.startsWith('/schedule')) {
      url.pathname = `/schedule${url.pathname}`;
      return NextResponse.rewrite(url);
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
