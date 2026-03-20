import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Auth is handled client-side (Supabase stores session in localStorage, not cookies).
// Middleware acts as a lightweight UX guard only. Real security = Supabase RLS.
const PUBLIC_PATHS = ['/', '/login', '/auth/callback', '/guide', '/demo', '/workspace', '/teams', '/project', '/settings'];
const PUBLIC_PREFIXES = ['/api/', '/_next/', '/favicon.ico'];

function isPublic(pathname: string): boolean {
  if (PUBLIC_PREFIXES.some(p => pathname.startsWith(p))) return true;
  return PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  // Try to verify auth from Supabase cookie or Authorization header
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return NextResponse.next();

  // Supabase JS stores session in cookies with pattern: sb-<ref>-auth-token
  // JWT can be chunked: sb-xxx-auth-token.0, sb-xxx-auth-token.1, etc.
  const allCookies = req.cookies.getAll();

  // If no cookie, check for PKCE flow in progress — allow through
  const codeVerifier = allCookies.find(c => c.name.includes('code-verifier'));
  if (codeVerifier) return NextResponse.next();

  // Reconstruct token from potentially chunked cookies
  let accessToken: string | null = null;

  // Find all auth-token cookies and sort by name (handles .0, .1, .2...)
  const authCookies = allCookies
    .filter(c => c.name.includes('auth-token'))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (authCookies.length > 0) {
    // Combine chunked cookie values
    const combined = authCookies.map(c => c.value).join('');
    try {
      const parsed = JSON.parse(combined);
      accessToken = parsed?.access_token || parsed?.[0]?.access_token || null;
    } catch {
      // Might be a raw token string
      accessToken = combined.length > 20 ? combined : null;
    }
  }

  // If no token at all, redirect to login
  // Actual data security is enforced by Supabase RLS — middleware is a UX guard only
  if (!accessToken) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Token exists — allow through. RLS protects the data.
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
