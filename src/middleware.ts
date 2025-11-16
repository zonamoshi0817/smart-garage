import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // Rewrite /favicon.ico to existing PNG to avoid 500s when .ico is missing
  if (pathname === '/favicon.ico') {
    const url = req.nextUrl.clone();
    url.pathname = '/icon.png';
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/favicon.ico'],
};



