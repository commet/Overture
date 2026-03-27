import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateContentType, validateOrigin } from '@/lib/api-security';
import { markdownToSlackBlocks } from '@/lib/slack-blocks';

async function getSlackToken(userId: string): Promise<string | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const { data } = await supabase
    .from('slack_connections')
    .select('access_token')
    .eq('user_id', userId)
    .limit(1)
    .single();
  return data?.access_token || null;
}

export async function POST(req: NextRequest) {
  // Security checks
  const ctError = validateContentType(req);
  if (ctError) return ctError;
  const originError = validateOrigin(req);
  if (originError) return originError;

  // Verify auth
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.slice(7);
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse body
  const body = await req.json();
  const { channelId, title, content } = body;

  if (!channelId || typeof channelId !== 'string' || !/^[CDGU][A-Z0-9]{5,}$/i.test(channelId)) {
    return NextResponse.json({ error: 'channelId is required' }, { status: 400 });
  }
  if (!title || typeof title !== 'string') {
    return NextResponse.json({ error: 'title is required' }, { status: 400 });
  }
  if (!content || typeof content !== 'string') {
    return NextResponse.json({ error: 'content is required' }, { status: 400 });
  }

  // Length limits
  const safeTitle = title.slice(0, 200);
  const safeContent = content.slice(0, 20000);

  const slackToken = await getSlackToken(user.id);
  if (!slackToken) {
    return NextResponse.json({ error: 'Slack not connected' }, { status: 404 });
  }

  const blocks = markdownToSlackBlocks(safeTitle, safeContent);

  const res = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${slackToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      channel: channelId,
      text: safeTitle, // fallback for notifications
      blocks,
    }),
  });

  const data = await res.json();
  if (!data.ok) {
    if (data.error === 'token_revoked' || data.error === 'invalid_auth') {
      const admin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
      );
      await admin.from('slack_connections').delete().eq('user_id', user.id);
      return NextResponse.json({ error: 'Slack connection expired. Please reconnect.' }, { status: 401 });
    }
    console.error('[slack/send] Slack API error:', data.error);
    return NextResponse.json({ error: 'Slack 메시지 전송에 실패했습니다.' }, { status: 502 });
  }

  return NextResponse.json({ ok: true, ts: data.ts });
}
