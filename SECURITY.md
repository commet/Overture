# Security Model

## Architecture

Overture uses a **client-first architecture** with Supabase as the backend:

- **Authentication**: Google OAuth + Email/Password via Supabase Auth
- **Authorization**: Row Level Security (RLS) on all 9 tables — `auth.uid() = user_id`
- **API Protection**: JWT verification + atomic rate limiting via Supabase RPC
- **Session Management**: Supabase JS client (client-side) + middleware (server-side)

## How data is protected

| Layer | Mechanism |
|---|---|
| **Route access** | Next.js middleware redirects unauthenticated users to `/login` |
| **Client-side guard** | `AuthGuard` component as a second layer |
| **API endpoints** | JWT token verification via `supabase.auth.getUser(token)` |
| **Database** | RLS policies enforce `auth.uid() = user_id` on every table |
| **Rate limiting** | Atomic Supabase RPC (`SECURITY DEFINER`), not client-writable |
| **User deletion** | `ON DELETE CASCADE` on all `user_id` foreign keys |

## API endpoints

| Endpoint | Auth | Rate Limited | Description |
|---|---|---|---|
| `POST /api/llm` | JWT required | 5/day per user | Proxy mode (server's API key) |
| `POST /api/llm/direct` | None (user's own key) | No | Direct mode (user provides key) |

## Known limitations & trade-offs

1. **localStorage as primary storage**: Data is stored in localStorage first, then synced to Supabase asynchronously. If sync fails, data exists only in the browser. This trade-off prioritizes speed and offline capability over durability.

2. **No Content-Security-Policy**: CSP is not configured due to the complexity of inline styles from Tailwind CSS. `X-Frame-Options: DENY` and `X-Content-Type-Options: nosniff` are set.

3. **Client-side prompt construction**: System prompts are built client-side with user-provided data (persona names, feedback logs, etc.) interpolated directly. This is acceptable because users are constructing prompts for their own LLM calls — there is no shared prompt context between users.

4. **In-memory rate limit cache**: `getCurrentUserId()` caches the user ID for 60 seconds to avoid excessive `getUser()` network calls. This means a revoked session may continue to function for up to 60 seconds client-side (server-side RLS still enforces access).

## Reporting vulnerabilities

If you discover a security vulnerability, please email the maintainer directly rather than opening a public issue.
