import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Simple client-side protection fallback for next.js middleware
  // In a real app we'd verify the JWT here, but since the JWT is in localStorage,
  // we rely on the layout client component for hard redirects.
  return NextResponse.next();
}

export const config = {
  matcher: '/dashboard/:path*',
};
