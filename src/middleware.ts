import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Public paths that do not require authentication
  const isPublicPath = path === '/login' || path.startsWith('/api/verify') || path.startsWith('/api/auth');
  
  // Get the token from cookies
  const token = request.cookies.get('admin_session')?.value;
  
  // A simple check (for production, we use a hashed token set by the login API)
  const isAuthenticated = !!token;
  
  if (isPublicPath && isAuthenticated && path === '/login') {
    return NextResponse.redirect(new URL('/', request.nextUrl));
  }
  
  if (!isPublicPath && !isAuthenticated) {
    // Redirect unauthenticated users to the login page
    return NextResponse.redirect(new URL('/login', request.nextUrl));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
