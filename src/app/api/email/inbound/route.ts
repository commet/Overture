import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Email inbound webhook — receives replies to human agent questions.
 *
 * Resend (or other provider) forwards incoming email here.
 * We extract the reply-token from the To address, match it to a tracked message,
 * and update the progressive session.
 *
 * Expected payload from Resend Inbound:
 *   from: string
 *   to: string (contains reply+{token}@domain)
 *   subject: string
 *   text: string (plain text body)
 *   html: string (html body)
 */

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

/** Extract reply token from email address: reply+{token}@domain → token */
function extractReplyToken(toAddress: string): string | null {
  const match = toAddress.match(/reply\+([a-zA-Z0-9_-]+)@/);
  return match?.[1] || null;
}

/** Strip quoted replies — keep only the new content */
function stripQuotedReply(text: string): string {
  const lines = text.split('\n');
  // Find where the quoted reply starts
  const cutoff = lines.findIndex(line => {
    const t = line.trim();
    return /^On .+ wrote:$/i.test(t)       // "On Mon, ... wrote:"
      || /^-{3,}/.test(t)                  // "------"
      || /^>/.test(t)                      // "> quoted text" (single chevron)
      || /^From:\s/.test(t)               // "From: sender"
      || /^_{3,}/.test(t)                 // "___" (Outlook separator)
      || /^Sent from my/.test(t);         // "Sent from my iPhone"
  });
  return cutoff > 0 ? lines.slice(0, cutoff).join('\n').trim() : text.trim();
}

export async function POST(req: NextRequest) {
  // Verify webhook secret — supports both header formats
  const webhookSecret = req.headers.get('x-webhook-secret');
  const authHeader = req.headers.get('authorization');
  const expectedSecret = process.env.EMAIL_INBOUND_SECRET;
  if (!expectedSecret) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });

  const isValid = webhookSecret === expectedSecret
    || authHeader === `Bearer ${expectedSecret}`;
  if (!isValid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const toAddress = body.to || '';
  const responseText = stripQuotedReply(body.text || body.html?.replace(/<[^>]*>/g, '') || '');

  const replyToken = extractReplyToken(toAddress);
  if (!replyToken) {
    return NextResponse.json({ error: 'No reply token found' }, { status: 400 });
  }
  if (!responseText) {
    return NextResponse.json({ error: 'Empty response' }, { status: 400 });
  }

  const admin = getAdmin();

  // Look up tracked message (not expired)
  const { data: tracked } = await admin
    .from('human_agent_messages')
    .select('session_id, worker_id, expires_at')
    .eq('reply_token', replyToken)
    .eq('channel', 'email')
    .eq('status', 'sent')
    .limit(1)
    .single();

  // Check TTL
  if (tracked?.expires_at && new Date(tracked.expires_at) < new Date()) {
    await admin.from('human_agent_messages').update({ status: 'expired' }).eq('reply_token', replyToken);
    return NextResponse.json({ error: 'Reply token expired' }, { status: 410 });
  }

  if (!tracked) {
    return NextResponse.json({ error: 'Unknown or expired reply token' }, { status: 404 });
  }

  // Atomic JSONB update — avoids read-modify-write race condition
  const safeResponse = responseText.slice(0, 10000);
  await admin.rpc('update_worker_response', {
    p_session_id: tracked.session_id,
    p_worker_id: tracked.worker_id,
    p_response: safeResponse,
  });

  // Mark message as responded
  await admin
    .from('human_agent_messages')
    .update({ status: 'responded', response_text: safeResponse, responded_at: new Date().toISOString() })
    .eq('session_id', tracked.session_id)
    .eq('worker_id', tracked.worker_id);

  return NextResponse.json({ ok: true });
}
