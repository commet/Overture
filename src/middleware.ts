import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Auth is handled entirely client-side (Supabase stores session in localStorage).
// Middleware cannot access localStorage, so auth enforcement is done by:
//   - LayoutShell + AuthGuard (client-side route protection)
//   - Supabase RLS (data-level security)
//   - API route IP-based rate limiting (anonymous usage cap)
//
// This middleware is a pass-through — kept as a hook for future needs
// (e.g., geo-based redirects, A/B testing, maintenance mode).

export function middleware(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
