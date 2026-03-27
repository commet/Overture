import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHmac, timingSafeEqual } from 'crypto';

const STATE_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes

function verifyState(stateParam: string): string | null {
  const secret = process.env.SLACK_SIGNING_SECRET;
  if (!secret) return null; // Fail closed if not configured

  try {
    const decoded = JSON.parse(Buffer.from(stateParam, 'base64url').toString());
    const { payload, sig } = decoded;
    const expected = createHmac('sha256', secret).update(payload).digest('hex');

    // Timing-safe comparison to prevent signature brute-forcing
    if (typeof sig !== 'string' || sig.length !== expected.length) return null;
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;

    const { userId, ts } = JSON.parse(payload);
    if (Date.now() - ts > STATE_MAX_AGE_MS) return null;
    return userId;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error || !code || !state) {
    return NextResponse.redirect(new URL('/settings?slack=error', req.url));
  }

  const userId = verifyState(state);
  if (!userId) {
    return NextResponse.redirect(new URL('/settings?slack=error&reason=state', req.url));
  }

  // Verify required env vars before exchanging code
  const clientId = process.env.SLACK_CLIENT_ID;
  const clientSecret = process.env.SLACK_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL('/settings?slack=error&reason=config', req.url));
  }

  // Exchange code for token
  const redirectUri = `${url.origin}/api/slack/callback`;
  const tokenRes = await fetch('https://slack.com/api/oauth.v2.access', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.ok) {
    console.error('Slack OAuth error:', tokenData.error);
    return NextResponse.redirect(new URL('/settings?slack=error&reason=token', req.url));
  }

  // Store in Supabase using service role
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { error: dbError } = await supabase
    .from('slack_connections')
    .upsert({
      user_id: userId,
      team_id: tokenData.team?.id,
      team_name: tokenData.team?.name || 'Slack Workspace',
      access_token: tokenData.access_token,
      scope: tokenData.scope || '',
      bot_user_id: tokenData.bot_user_id,
      authed_user_id: tokenData.authed_user?.id,
      incoming_webhook_url: tokenData.incoming_webhook?.url,
      incoming_webhook_channel: tokenData.incoming_webhook?.channel,
      incoming_webhook_channel_id: tokenData.incoming_webhook?.channel_id,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,team_id' });

  if (dbError) {
    console.error('Slack connection save error:', dbError);
    return NextResponse.redirect(new URL('/settings?slack=error&reason=db', req.url));
  }

  return NextResponse.redirect(new URL('/settings?slack=connected', req.url));
}
