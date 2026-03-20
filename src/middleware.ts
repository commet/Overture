import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const PUBLIC_PATHS = ['/', '/login', '/auth/callback', '/guide', '/demo'];
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
  const allCookies = req.cookies.getAll();
  const authCookie = allCookies.find(c => c.name.includes('auth-token'));

  // Also check for access token in cookie storage (Supabase stores as JSON)
  let accessToken: string | null = null;

  if (authCookie?.value) {
    try {
      // Supabase cookie can be a JSON object with access_token
      const parsed = JSON.parse(authCookie.value);
      accessToken = parsed?.access_token || parsed?.[0]?.access_token || null;
    } catch {
      accessToken = authCookie.value;
    }
  }

  // If no cookie, check for base64-encoded code-verifier (PKCE flow in progress)
  // During OAuth redirect, cookies may not have the token yet — allow through
  if (!accessToken) {
    const codeVerifier = allCookies.find(c => c.name.includes('code-verifier'));
    if (codeVerifier) return NextResponse.next();
  }

  if (!accessToken) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Verify the token is valid
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);

  if (error || !user) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
