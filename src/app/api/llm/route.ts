import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const MAX_TOKENS_CAP = 4096;
const DAILY_LIMIT = 50; // Increased during development
const MAX_MESSAGE_LENGTH = 50_000;
const MAX_SYSTEM_LENGTH = 10_000;
const VALID_ROLES = new Set(['user', 'assistant']);

/**
 * Verify Supabase auth token from request.
 * Returns { userId, token } if valid, null otherwise.
 */
async function verifyAuth(req: NextRequest): Promise<{ userId: string; token: string } | null> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return { userId: user.id, token };
}

/**
 * Atomic rate limiter via Supabase RPC.
 * - Runs as SECURITY DEFINER (user cannot tamper with the table)
 * - Single INSERT ... ON CONFLICT with WHERE count < limit (no race condition)
 */
async function checkRateLimit(userId: string, token: string): Promise<boolean> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const { data, error } = await supabase.rpc('check_and_increment_rate_limit', {
    p_user_id: userId,
    p_limit: DAILY_LIMIT,
  });

  if (error) {
    // RPC error — fail closed (deny the request)
    console.error('[rate-limit] RPC error:', error.message);
    return false;
  }

  return data === true;
}

/**
 * Validate messages array structure.
 */
function validateMessages(messages: unknown): messages is Array<{ role: string; content: string }> {
  if (!Array.isArray(messages) || messages.length === 0) return false;
  return messages.every(
    (m: unknown) =>
      typeof m === 'object' && m !== null &&
      'role' in m && VALID_ROLES.has((m as { role: unknown }).role as string) &&
      'content' in m && typeof (m as { content: unknown }).content === 'string' &&
      ((m as { content: string }).content.length <= MAX_MESSAGE_LENGTH)
  );
}

export async function POST(req: NextRequest) {
  // 1. Authenticate
  const auth = await verifyAuth(req);
  if (!auth) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  // 2. Check server API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: '서버에 API 키가 설정되지 않았습니다. 설정에서 직접 API 키를 입력해주세요.' },
      { status: 503 }
    );
  }

  // 3. Atomic rate limit (Supabase RPC, no race condition)
  const allowed = await checkRateLimit(auth.userId, auth.token);
  if (!allowed) {
    return NextResponse.json(
      { error: '일일 무료 사용량을 초과했습니다. 설정에서 직접 API 키를 입력하면 제한 없이 사용할 수 있습니다.' },
      { status: 429 }
    );
  }

  // 4. Validate input
  try {
    const body = await req.json();
    const { messages, system } = body;
    const maxTokens = Math.min(Number(body.maxTokens) || 2000, MAX_TOKENS_CAP);

    if (typeof system !== 'string' || system.length > MAX_SYSTEM_LENGTH) {
      return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
    }

    if (!validateMessages(messages)) {
      return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
    }

    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      system,
      messages: messages as Anthropic.MessageParam[],
    });

    const block = response.content.find((b) => b.type === 'text');
    return NextResponse.json({ text: block ? block.text : '' });
  } catch {
    return NextResponse.json(
      { error: 'LLM 호출 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' },
      { status: 500 }
    );
  }
}
